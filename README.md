# rock-pet

A small grey pebble that lives on Cloudflare's edge. It has a mood, it remembers what people give it, and it occasionally has a passing thought when no one is watching.

One global rock; every visitor connects to the same instance and feeds the same rock.

## What's in it

| Requirement (from the assignment brief) | Implementation |
| --- | --- |
| LLM | **Llama 3.3 70B (FP8)** on Workers AI for reactions, with **Llama 3.1 8B** as a fast fallback and as the structured-output classifier for warmth scoring |
| Workflow / coordination | A single **Durable Object** (`RockAgent`) holds the rock's state and serializes all interactions. Background work runs on the SDK's scheduled-task system (`tick` hourly, `think` every 3 hours) so the rock continues to age and have thoughts even when no one is connected |
| User input | Native browser **WebSocket** to the agent over the `agents` SDK routing (`/agents/rock-agent/the-rock`). React frontend with two text inputs (feed / say) |
| Memory / state | The agent persists `mood`, `energy`, `age`, `currentThought`, and a rolling buffer of recent feedings + chats in Durable Object SQLite. Every state change is broadcast to all connected clients |

The semantic layer (warmth scoring) is the bit that makes the rock's mood feel responsive instead of keyword-driven: every input is sent in parallel to a small LLM that returns a `{warmth: -10..10}` JSON object, and the result drives the mood delta.

## Layout

```
rock-pet/
├── worker/                            Cloudflare Worker + Durable Object
│   ├── src/
│   │   ├── index.ts                   Worker entry — routing, CORS, healthchecks
│   │   ├── rock-agent.ts              The agent class — state, scheduling, lifecycle
│   │   ├── prompts.ts                 System + user prompts and few-shot examples
│   │   ├── types.ts                   RockState, Env, wire-protocol types
│   │   └── lib/
│   │       ├── llm.ts                 generateText() + scoreWarmth()
│   │       └── sentiment.ts           Keyword-based fallback sentiment
│   ├── wrangler.jsonc                 Bindings: AI, RockAgent DO, 3× rate limiters
│   ├── tsconfig.json
│   └── package.json
└── web/                               Vite + React frontend
    ├── src/
    │   ├── App.jsx                    Layout composition only
    │   ├── components/
    │   │   ├── RockArt.jsx            Inline-SVG rock with mood-driven smile + blink
    │   │   ├── Bubble.jsx             Speech bubble (pops in on each new thought)
    │   │   ├── Chat.jsx               Two input forms + status line
    │   │   ├── Stats.jsx              Mood / energy / age pills
    │   │   ├── Memories.jsx           Recent feedings + utterances as chips
    │   │   ├── Footer.jsx             Connection indicator + attribution
    │   │   ├── Doodles.jsx            Background sun + clouds + sparkles
    │   │   └── icons.jsx              Heart / Bolt / Clock SVGs
    │   ├── lib/
    │   │   └── agentClient.js         useRockAgent() hook (websocket + reconnect)
    │   ├── index.css                  Tailwind + bubble/blink/breathe keyframes
    │   └── main.jsx
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

## Running locally

Prerequisites: Node 20+ and a Cloudflare account.

```bash
# 1. Authenticate (once). wrangler picks the right account automatically.
cd worker
npm install
npx wrangler login

# 2. Start the worker on :8787.
npm run dev

# 3. In a second terminal, start the frontend on :5173.
cd web
npm install
npm run dev
```

Open <http://localhost:5173>. The footer dot turns green when the websocket is connected.

The frontend reads `VITE_ROCK_WORKER_URL` (default `http://localhost:8787`). For a deployed worker, set it via `web/.env.local`.

### Verifying the AI binding

```bash
curl http://localhost:8787/healthz/ai
# → {"ok": true, "response": "..."}
```

If you get `"Not logged in"`, run `npx wrangler login` again and restart `wrangler dev`.

## Deploying

**Worker:**
```bash
cd worker
npm run deploy
```
Note the `*.workers.dev` URL — you'll need it for the frontend env var.

**Frontend (Cloudflare Pages):**
```bash
cd web
echo "VITE_ROCK_WORKER_URL=https://your-worker.workers.dev" > .env.production.local
npm run build
npx wrangler pages deploy dist --project-name rock-pet
```

Or hook the repo up in the Cloudflare dashboard with `npm run build` as the build command, `dist` as the output directory, and `VITE_ROCK_WORKER_URL` as a build env var.

## Rate limiting

Three bindings declared in [`worker/wrangler.jsonc`](worker/wrangler.jsonc):

| Binding | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `IP_RATE_LIMITER` | per-IP | 12 / 60s | Caps WebSocket upgrades — one IP can't churn reconnects |
| `MSG_RATE_LIMITER` | per-IP | 20 / 60s | Caps `feed`/`say` actions per visitor |
| `GLOBAL_RATE_LIMITER` | global | 120 / 60s | Hard ceiling on total LLM calls — bounds the AI bill |

The agent additionally enforces a `MIN_MS_BETWEEN_MESSAGES = 1500` per-connection throttle, so a single tab can't fire-hose between rate-limit windows.

If a binding is removed from `wrangler.jsonc`, the agent skips that layer silently rather than failing — useful for purely-local dev.

For broader DDoS, Cloudflare's edge gives you free L3/L4 mitigation by default; enable Bot Fight Mode and a WAF rate-limit rule on `/agents/*` for L7 layering.

## Wire protocol

WebSocket at `/agents/rock-agent/the-rock`. Message envelopes:

```ts
// client → server
{ type: 'feed', thing: string }
{ type: 'say',  text:  string }
{ type: 'ping' }

// server → client
{ type: 'state',         state: RockState }
{ type: 'rate_limited',  reason: string, retry_in_ms?: number }

// also: { type: 'cf_agent_state', state }  ← emitted by the agents SDK; client accepts both
```

`RockState` is defined in [`worker/src/types.ts`](worker/src/types.ts).

## Notes on the rock's voice

- The system prompt forbids em/en dashes and asterisk-narration. Sanitization is also applied server-side as a backstop so the rock can't accidentally stylize itself out of character.
- Few-shot examples are deliberately heterogeneous in length and structure — adding a uniform-template example will collapse outputs into that template.
- Mood deltas are driven by a parallel LLM call (`scoreWarmth`) that semantically classifies the input, not by keyword matching. The keyword path remains as a fallback if structured-output parsing fails.

## License

MIT.
