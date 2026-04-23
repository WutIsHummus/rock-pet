/**
 * The Rock — a Cloudflare Durable Object backed by the `agents` SDK.
 *
 * Responsibilities:
 *   - Hold + persist `RockState` (mood, energy, age, recent memories).
 *   - Handle `feed` and `say` actions: in parallel, generate a reaction
 *     (Llama 3.3) and semantically score the input's warmth (Llama 3.1).
 *   - Run scheduled background tasks: hourly energy decay (`tick`) and an
 *     ambient "passing thought" every ~3 hours (`think`).
 *   - Push state to all connected WebSocket clients on every change.
 *   - Enforce per-connection / per-IP / global rate limits where bindings
 *     are configured.
 */

import { Agent, type Connection, type ConnectionContext } from "agents";
import { generateText, scoreWarmth } from "./lib/llm";
import { rockSystemPrompt, userPrompts } from "./prompts";
import type { Env, Memory, RockState, ServerMessage, ClientMessage } from "./types";

/** A single connection cannot fire actions faster than this. */
const MIN_MS_BETWEEN_MESSAGES = 1500;
/** How many memories the rock holds onto. */
const MAX_MEMORIES = 8;
/** Hourly energy lost to entropy. */
const ENERGY_DECAY_PER_HOUR = 6;
/** Mood lost per hour while energy is below `LOW_ENERGY_THRESHOLD`. */
const MOOD_LOSS_WHEN_TIRED = 4;
const LOW_ENERGY_THRESHOLD = 25;
/** Energy gained per `feed` action. */
const ENERGY_PER_FEED = 8;
/** Baseline mood bump for being given anything at all (before warmth score). */
const BASELINE_FEED_MOOD = 2;
/** Baseline mood bump for being talked to (before warmth score). */
const BASELINE_SAY_MOOD = 0;

const initialState: RockState = {
  age: 0,
  mood: 55,
  energy: 75,
  birthDate: new Date().toISOString(),
  lastFed: null,
  lastFedThing: null,
  currentThought: "you found me. this is fine.",
  currentThoughtKind: "idle",
  currentThoughtAt: new Date().toISOString(),
  memories: [],
};

export class RockAgent extends Agent<Env, RockState> {
  initialState: RockState = initialState;

  /** Volatile per-connection IP map — used for in-message rate limiting. */
  private readonly ipByConnection = new Map<string, string>();
  /** Volatile per-connection last-action timestamp — local throttle. */
  private readonly lastMessageAt = new Map<string, number>();

  /* ───── lifecycle ───── */

  async onStart(): Promise<void> {
    try {
      const existing = await this.getSchedules();
      const callbacks = new Set(existing.map((s) => s.callback));
      if (!callbacks.has("tick")) await this.schedule(60 * 60, "tick");
      if (!callbacks.has("think")) await this.schedule(60 * 60 * 3, "think");
    } catch (e) {
      console.error("[rock] schedule failed", e);
    }
  }

  async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    const ip = ctx.request.headers.get("cf-connecting-ip") ?? "local";
    this.ipByConnection.set(connection.id, ip);
    this.sendTo(connection, { type: "state", state: this.state });
  }

  async onClose(connection: Connection): Promise<void> {
    this.ipByConnection.delete(connection.id);
    this.lastMessageAt.delete(connection.id);
  }

  async onMessage(
    connection: Connection,
    message: string | ArrayBuffer | ArrayBufferView,
  ): Promise<void> {
    const payload = parseClientMessage(message);
    if (!payload) return;

    if (payload.type === "ping") {
      this.sendTo(connection, { type: "state", state: this.state });
      return;
    }

    if (!(await this.checkRateLimits(connection))) return;

    if (payload.type === "feed") {
      await this.feed(payload.thing.slice(0, 160));
    } else if (payload.type === "say") {
      await this.say(payload.text.slice(0, 400));
    }
  }

  /* ───── scheduled tasks ───── */

  async tick(): Promise<void> {
    const next: RockState = {
      ...this.state,
      age: this.state.age + 1,
      energy: clamp(this.state.energy - ENERGY_DECAY_PER_HOUR, 0, 100),
    };
    if (next.energy < LOW_ENERGY_THRESHOLD) {
      next.mood = clamp(next.mood - MOOD_LOSS_WHEN_TIRED, 0, 100);
    }
    this.setState(next);
    this.broadcastState();
    await this.schedule(60 * 60, "tick");
  }

  async think(): Promise<void> {
    try {
      const thought = await generateText(this.env.AI, {
        system: rockSystemPrompt(this.state),
        user: userPrompts.think(),
      });
      this.setState({
        ...this.state,
        currentThought: thought,
        currentThoughtKind: "thought",
        currentThoughtAt: new Date().toISOString(),
      });
      this.broadcastState();
    } catch (e) {
      console.error("[rock] think failed", e);
    }
    await this.schedule(60 * 60 * 3, "think");
  }

  /* ───── action handlers ───── */

  private async feed(thing: string): Promise<void> {
    console.log(`[rock] feed: ${thing}`);
    const [reaction, warmth] = await Promise.all([
      this.generateReaction(userPrompts.feed(thing), `you put "${thing}" on me. okay.`),
      scoreWarmth(this.env.AI, thing),
    ]);

    const at = new Date().toISOString();
    const memories = prependMemory(this.state.memories, { kind: "fed", text: thing, at });
    const moodDelta = BASELINE_FEED_MOOD + warmth;

    this.setState({
      ...this.state,
      lastFed: at,
      lastFedThing: thing,
      mood: clamp(this.state.mood + moodDelta, 0, 100),
      energy: clamp(this.state.energy + ENERGY_PER_FEED, 0, 100),
      currentThought: reaction,
      currentThoughtKind: "fed",
      currentThoughtAt: at,
      memories,
    });
    this.broadcastState();
  }

  private async say(message: string): Promise<void> {
    console.log(`[rock] say: ${message}`);
    const [reply, warmth] = await Promise.all([
      this.generateReaction(userPrompts.say(message), "..."),
      scoreWarmth(this.env.AI, message),
    ]);

    const at = new Date().toISOString();
    const memories = prependMemory(this.state.memories, { kind: "said", text: message, at });
    const moodDelta = BASELINE_SAY_MOOD + warmth;

    this.setState({
      ...this.state,
      mood: clamp(this.state.mood + moodDelta, 0, 100),
      currentThought: reply,
      currentThoughtKind: "said",
      currentThoughtAt: at,
      memories,
    });
    this.broadcastState();
  }

  private async generateReaction(userPrompt: string, fallback: string): Promise<string> {
    try {
      return await generateText(this.env.AI, {
        system: rockSystemPrompt(this.state),
        user: userPrompt,
      });
    } catch (e) {
      console.error("[rock] reaction LLM failed", e);
      return fallback;
    }
  }

  /* ───── rate limiting ───── */

  /**
   * Returns true if the message should proceed. Sends an explanatory
   * `rate_limited` message to the client and re-syncs state otherwise.
   */
  private async checkRateLimits(connection: Connection): Promise<boolean> {
    const now = Date.now();
    const last = this.lastMessageAt.get(connection.id) ?? 0;
    if (now - last < MIN_MS_BETWEEN_MESSAGES) {
      this.sendTo(connection, {
        type: "rate_limited",
        reason: "slow down a moment.",
        retry_in_ms: MIN_MS_BETWEEN_MESSAGES - (now - last),
      });
      this.sendTo(connection, { type: "state", state: this.state });
      return false;
    }
    this.lastMessageAt.set(connection.id, now);

    const ip = this.ipByConnection.get(connection.id) ?? "local";

    if (await isOverLimit(this.env.MSG_RATE_LIMITER, ip, "msg")) {
      this.sendTo(connection, { type: "rate_limited", reason: "too many actions. take a breath." });
      this.sendTo(connection, { type: "state", state: this.state });
      return false;
    }

    if (await isOverLimit(this.env.GLOBAL_RATE_LIMITER, "global", "global")) {
      this.sendTo(connection, {
        type: "rate_limited",
        reason: "the rock is overwhelmed by visitors.",
      });
      this.sendTo(connection, { type: "state", state: this.state });
      return false;
    }
    return true;
  }

  /* ───── messaging helpers ───── */

  private sendTo(connection: Connection, message: ServerMessage): void {
    connection.send(JSON.stringify(message));
  }

  private broadcastState(): void {
    const message: ServerMessage = { type: "state", state: this.state };
    this.broadcast(JSON.stringify(message));
  }
}

/* ───── module-level helpers ───── */

function parseClientMessage(
  raw: string | ArrayBuffer | ArrayBufferView,
): ClientMessage | null {
  let text: string;
  if (typeof raw === "string") {
    text = raw;
  } else if (raw instanceof ArrayBuffer) {
    text = new TextDecoder().decode(raw);
  } else {
    const view = raw as ArrayBufferView;
    text = new TextDecoder().decode(
      new Uint8Array(view.buffer as ArrayBuffer, view.byteOffset, view.byteLength),
    );
  }
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { type?: unknown; thing?: unknown; text?: unknown };
  if (obj.type === "feed" && typeof obj.thing === "string") return { type: "feed", thing: obj.thing };
  if (obj.type === "say" && typeof obj.text === "string") return { type: "say", text: obj.text };
  if (obj.type === "ping") return { type: "ping" };
  return null;
}

function prependMemory(memories: Memory[], next: Memory): Memory[] {
  return [next, ...memories].slice(0, MAX_MEMORIES);
}

async function isOverLimit(
  limiter: { limit(opts: { key: string }): Promise<{ success: boolean }> } | undefined,
  key: string,
  label: string,
): Promise<boolean> {
  if (!limiter) return false;
  try {
    const r = await limiter.limit({ key });
    return !r.success;
  } catch (e) {
    console.error(`[rock] ${label} rate-limiter failed (allowing)`, e);
    return false;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
