#!/usr/bin/env node
/**
 * obfus.link agent demo — turn a messy LLM response into clean, typed data,
 * deterministically, in two tool calls against the live obfus.link MCP grid.
 *
 * Why this exists: agents constantly need mechanical transforms (repair JSON,
 * write a schema, hash, encode). Asking the model to do them burns tokens,
 * varies run-to-run, and fails validation often enough to need retries. A
 * deterministic tool returns the one correct answer, byte-identical, every time.
 *
 * No API key, no install — runs on the free tier (50 calls/IP). Requires Node 18+.
 *   node demo.mjs
 *
 * For production, set OBFUS_SPT to a Shared Payment Token (see https://obfus.link/docs/mcp).
 */
const MCP = process.env.OBFUS_MCP_URL ?? 'https://obfus.link/mcp';
const SPT = process.env.OBFUS_SPT; // optional — a Shared Payment Token for paid use

let id = 0;
async function callTool(name, args) {
  const headers = { 'Content-Type': 'application/json' };
  if (SPT) headers['Authorization'] = `Bearer ${SPT}`;
  const res = await fetch(MCP, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } }),
  });
  const rpc = await res.json();
  if (rpc.error) {
    throw new Error(`${name}: ${rpc.error.message} ${JSON.stringify(rpc.error.data ?? '')}`);
  }
  const text = rpc.result?.content?.find((c) => c.type === 'text')?.text ?? '{}';
  const out = JSON.parse(text);
  if (out.status === 'error') throw new Error(`${name} [${out.code}]: ${out.suggestion}`);
  return out.result;
}

// A typical messy LLM response: chatty preamble, a markdown fence, trailing commas.
const messyModelOutput = `Sure! Here's the user record you asked for:
\`\`\`json
{
  "userId": "u_8a2f",
  "email": "ada@example.com",
  "roles": ["admin", "editor",],
  "lastSeen": "2026-06-21T18:54:00Z",
}
\`\`\`
Let me know if you'd like anything else!`;

async function main() {
  console.log('obfus.link agent demo — messy LLM output → clean, typed data\n');

  console.log('1) Repair the messy model output → clean JSON   [llm_to_json_cleaner]');
  const cleaned = await callTool('llm_to_json_cleaner', {
    raw: messyModelOutput,
    strict: false,
    repairStrategy: 'conservative',
  });
  console.log(JSON.stringify(cleaned.json, null, 2));

  console.log('\n2) Generate a typed Zod schema from it          [json_to_zod]');
  const zod = await callTool('json_to_zod', {
    json: JSON.stringify(cleaned.json),
    schemaName: 'UserSchema',
    strict: true,
    coerce: false,
    autoJsDoc: true,
    inferBranding: true,
    dateStrategy: 'coerce',
  });
  console.log(zod.schema);

  console.log('\n✓ Two deterministic calls. Byte-identical every run, zero retries.');
  console.log('  The model never hand-wrote the JSON or the schema — that is the point.');
}

main().catch((err) => {
  console.error('\n✗', err.message);
  process.exit(1);
});
