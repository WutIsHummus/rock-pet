# rock-pet

A small grey pebble that lives on Cloudflare's edge. It has a mood, it remembers what people give it, and it has the occasional thought when no one's around.

There is one global rock. Everyone who visits is feeding the same one.

## How it covers the four pieces

- **LLM**: Llama 3.3 70B on Workers AI for the rock's reactions, with Llama 3.1 8B as a faster fallback and as a structured-output classifier that scores how warm or hostile each input is. That score drives mood.
- **Workflow / coordination**: a single Durable Object (`RockAgent`, via the `agents` SDK) holds state and serializes everything. Scheduled tasks decay energy hourly and produce a passing thought every few hours, so the rock keeps living when no one is connected.
- **User input**: a Vite + React frontend on Cloudflare Pages, talking to the agent over WebSocket. Two text inputs: feed it something, or say something to it.
- **Memory / state**: mood, energy, age, current thought, and a rolling buffer of recent feedings live in Durable Object SQLite. Every change is pushed to all connected clients.

## Run it

```bash
cd worker
npm install
npx wrangler login         # one time
npm run dev                # :8787
```

In a second terminal:

```bash
cd web
npm install
npm run dev                # :5173
```

Open <http://localhost:5173>.

## Deploy

```bash
# worker
cd worker && npm run deploy

# frontend (point it at the worker URL the deploy printed)
cd ../web
echo "VITE_ROCK_WORKER_URL=https://your-worker.workers.dev" > .env.production.local
npm run build
npx wrangler pages deploy dist --project-name rock-pet
```

## License

MIT.
