/**
 * Worker entrypoint. Routes WebSocket upgrades to the `RockAgent` Durable
 * Object via the `agents` SDK, applies a per-IP connection-rate cap, and
 * exposes two unauthenticated health-check endpoints for ops.
 */

import { routeAgentRequest } from "agents";
import type { Env } from "./types";

export { RockAgent } from "./rock-agent";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const HEALTHCHECK_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/healthz") {
      return text("rock agent ok\n");
    }

    if (url.pathname === "/healthz/ai") {
      return aiHealthcheck(env);
    }

    if (url.pathname.startsWith("/agents/")) {
      const limited = await applyConnectionRateLimit(request, env);
      if (limited) return limited;
    }

    const routed = await routeAgentRequest(request, env, { cors: true });
    if (routed) return routed;

    return text("not found\n", 404);
  },
} satisfies ExportedHandler<Env>;

/* ───── handlers ───── */

async function applyConnectionRateLimit(request: Request, env: Env): Promise<Response | null> {
  if (!env.IP_RATE_LIMITER) return null;
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  try {
    const r = await env.IP_RATE_LIMITER.limit({ key: ip });
    if (!r.success) {
      return text("too many connections from this address. try again in a moment.\n", 429, {
        "Retry-After": "30",
      });
    }
  } catch (e) {
    console.error("[index] IP rate limiter failed (allowing)", e);
  }
  return null;
}

async function aiHealthcheck(env: Env): Promise<Response> {
  try {
    const result = (await env.AI.run(HEALTHCHECK_MODEL, {
      messages: [
        { role: "system", content: "you are a rock. one word." },
        { role: "user", content: "say hi" },
      ],
      max_tokens: 32,
    })) as { response?: string };
    return json({ ok: true, response: result.response ?? null });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
}

/* ───── small response helpers ───── */

function text(body: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "text/plain", ...extraHeaders },
  });
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
