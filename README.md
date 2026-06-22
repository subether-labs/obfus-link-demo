# obfus.link agent demo

Turn a messy LLM response into clean, **typed** data — deterministically — in
two tool calls against the live [obfus.link](https://obfus.link) MCP grid.

No API key. No install. It runs on the free tier (50 calls per IP).

```bash
node demo.mjs
```

```
1) Repair the messy model output → clean JSON   [llm_to_json_cleaner]
{
  "userId": "u_8a2f",
  "email": "ada@example.com",
  "roles": ["admin", "editor"],
  "lastSeen": "2026-06-21T18:54:00Z"
}

2) Generate a typed Zod schema from it          [json_to_zod]
const UserSchema = z.object({
  userId: z.string().brand<'UserId'>(),
  email: z.string(),
  roles: z.array(z.string()),
  lastSeen: z.coerce.date(),
}).strict();
```

## Why this matters

Agents constantly need **mechanical transforms** — repair JSON, write a schema,
hash a value, encode an image, harden a JWT. Asking the model to do them:

- **burns output tokens** (the expensive kind),
- **varies run-to-run** (a generation is a gamble), and
- **fails validation** often enough to need retries.

A deterministic tool returns the **one correct answer, byte-identical, every
time** — a tool call is a contract, not a guess. This demo chains two of
obfus.link's 31 tools (`llm_to_json_cleaner` → `json_to_zod`) to take the single
most common agent failure — an LLM emitting JSON wrapped in prose and trailing
commas — and turn it into validated, branded TypeScript types with zero retries.

It's also **lean by design**: obfus.link lists only a search tool by default, so
connecting doesn't dump ~21k tokens of tool definitions into your agent's context
(see [the numbers](https://obfus.link/why)).

## How it works

`demo.mjs` is a single zero-dependency file (Node 18+). It POSTs JSON-RPC
`tools/call` requests to `https://obfus.link/mcp` and parses the deterministic
result. That's the whole integration — any MCP client works the same way.

## Going to production

The free tier is 50 calls per IP. After that, tool calls are machine-payable:
the endpoint returns `402` with a payment challenge an agent can complete on its
own. Pass a Shared Payment Token to authenticate:

```bash
OBFUS_SPT=spt_xxx node demo.mjs
```

See the [MCP docs](https://obfus.link/docs/mcp) to add obfus.link to Claude or any
MCP-compatible agent, and [pricing](https://obfus.link/pricing) for per-call costs.

## Links

- Why deterministic tools — https://obfus.link/why
- The 31-tool grid — https://obfus.link
- MCP onboarding — https://obfus.link/docs/mcp

---

A [Subether Labs](https://subether.dev) infrastructure project.
