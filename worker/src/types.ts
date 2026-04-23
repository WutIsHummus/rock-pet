/**
 * Shared types for the rock-pet worker.
 *
 * The rock has two kinds of state: persistent (lives in Durable Object SQLite,
 * survives restarts) and ambient (mood/energy decay over time via scheduled
 * ticks). Both are exposed to clients as a single immutable `RockState` record.
 */

export type ThoughtKind = "fed" | "said" | "thought" | "idle";

export type Memory = {
  kind: "fed" | "said";
  text: string;
  /** ISO-8601 timestamp. */
  at: string;
};

export type RockState = {
  /** Hours since the rock first booted. */
  age: number;
  /** 0 (despondent) to 100 (delighted). */
  mood: number;
  /** 0 (sleepy) to 100 (wired). */
  energy: number;
  /** ISO-8601. */
  birthDate: string;
  /** ISO-8601 of the last `feed` action, or null. */
  lastFed: string | null;
  /** Most recent thing fed to the rock. */
  lastFedThing: string | null;
  /** What the rock is currently thinking out loud. */
  currentThought: string;
  /** Why it's thinking that. */
  currentThoughtKind: ThoughtKind;
  /** ISO-8601 of when `currentThought` was set. */
  currentThoughtAt: string;
  /** Most recent feedings + chats, newest first, capped. */
  memories: Memory[];
};

/**
 * Workers Rate Limiting binding shape.
 * Subset of the official `RateLimit` interface — declared locally so the worker
 * can compile without the latest `@cloudflare/workers-types` runtime imports.
 */
export interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Worker bindings declared in `wrangler.jsonc`. The three rate-limit bindings
 * are optional — the agent silently skips checks if any are missing, which
 * keeps `wrangler dev` simple in environments without rate-limit access.
 */
export interface Env {
  AI: Ai;
  RockAgent: DurableObjectNamespace;
  IP_RATE_LIMITER?: RateLimiter;
  MSG_RATE_LIMITER?: RateLimiter;
  GLOBAL_RATE_LIMITER?: RateLimiter;
}

/* ────────────────────────────────────────────────────────────
 * Wire protocol — JSON messages exchanged over the WebSocket.
 * The Cloudflare `agents` SDK uses its own `cf_agent_state` /
 * `rpc` envelopes internally; everything below is on top of that
 * for our own per-message protocol.
 * ──────────────────────────────────────────────────────────── */

export type ClientMessage =
  | { type: "feed"; thing: string }
  | { type: "say"; text: string }
  | { type: "ping" };

export type ServerMessage =
  | { type: "state"; state: RockState }
  | { type: "rate_limited"; reason: string; retry_in_ms?: number };
