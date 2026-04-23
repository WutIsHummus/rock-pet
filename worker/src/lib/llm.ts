/**
 * Workers AI helpers.
 *
 * Two distinct concerns live here:
 *   1. `generateText` — call the rock's main reaction model (Llama 3.3 70B
 *      preferred, Llama 3.1 8B fallback) with a single timeout + retry loop.
 *   2. `scoreWarmth` — call a small fast model with structured-JSON output to
 *      semantically rate how warm or hostile an input is. Falls back to a
 *      keyword-based heuristic if the LLM/JSON path fails.
 */

import { warmthScorerSystemPrompt } from "../prompts";
import { keywordSentimentDelta } from "./sentiment";

const PRIMARY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const REACTION_TIMEOUT_MS = 18_000;
const WARMTH_TIMEOUT_MS = 7_000;

export interface GenerateOpts {
  /** System prompt for the rock's voice. */
  system: string;
  /** Per-turn user message. */
  user: string;
  /** Override max output tokens (default 180). */
  maxTokens?: number;
  /** Override sampling temperature (default 0.95). */
  temperature?: number;
}

/**
 * Generate a short reaction from the rock. Tries the primary model first,
 * falls back to a smaller faster model on any failure.
 */
export async function generateText(ai: Ai, opts: GenerateOpts): Promise<string> {
  const messages = [
    { role: "system" as const, content: opts.system },
    { role: "user" as const, content: opts.user },
  ];
  const aiOpts = {
    messages,
    max_tokens: opts.maxTokens ?? 180,
    temperature: opts.temperature ?? 0.95,
  };

  const t0 = Date.now();
  try {
    const result = (await withTimeout(
      ai.run(PRIMARY_MODEL, aiOpts),
      REACTION_TIMEOUT_MS,
      `LLM (${PRIMARY_MODEL})`,
    )) as AiResult;
    const text = sanitize(extractText(result));
    if (!text) throw new Error("empty primary response");
    console.log(`[rock] LLM ok in ${Date.now() - t0}ms model=${PRIMARY_MODEL} → ${JSON.stringify(text)}`);
    return text;
  } catch (primaryErr) {
    console.warn(`[rock] primary LLM failed in ${Date.now() - t0}ms: ${(primaryErr as Error).message}`);
  }

  // Fallback to the smaller, faster model
  const t1 = Date.now();
  const result = (await withTimeout(
    ai.run(FALLBACK_MODEL, aiOpts),
    REACTION_TIMEOUT_MS,
    `LLM-fallback (${FALLBACK_MODEL})`,
  )) as AiResult;
  const text = sanitize(extractText(result));
  if (!text) throw new Error("empty fallback response");
  console.log(`[rock] fallback LLM ok in ${Date.now() - t1}ms model=${FALLBACK_MODEL} → ${JSON.stringify(text)}`);
  return text;
}

/**
 * Use a small fast LLM to semantically score the warmth of an input.
 * Returns an integer in [-10, 10]. Falls back to keyword scoring if the
 * structured-output call fails or returns malformed JSON.
 */
export async function scoreWarmth(ai: Ai, input: string): Promise<number> {
  const t0 = Date.now();
  try {
    const result = (await withTimeout(
      ai.run(FALLBACK_MODEL, {
        messages: [
          { role: "system", content: warmthScorerSystemPrompt },
          { role: "user", content: input.slice(0, 200) },
        ],
        max_tokens: 24,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: { warmth: { type: "integer", minimum: -10, maximum: 10 } },
            required: ["warmth"],
          },
        },
      }),
      WARMTH_TIMEOUT_MS,
      "warmth-score",
    )) as AiResult & { response?: unknown };

    const warmth = parseWarmth(result);
    if (warmth === null) throw new Error("could not parse warmth");
    console.log(`[rock] warmth ok in ${Date.now() - t0}ms → ${warmth}`);
    return warmth;
  } catch (e) {
    console.warn(`[rock] warmth fell back to keywords (${(e as Error).message})`);
    return keywordSentimentDelta(input);
  }
}

function parseWarmth(result: AiResult & { response?: unknown }): number | null {
  let candidate: unknown = result.response;
  if (typeof candidate === "string") {
    try { candidate = JSON.parse(candidate); } catch { /* fall through */ }
  }
  if (
    candidate &&
    typeof candidate === "object" &&
    "warmth" in candidate &&
    typeof (candidate as { warmth: unknown }).warmth === "number"
  ) {
    return clamp(Math.round((candidate as { warmth: number }).warmth), -10, 10);
  }
  // Last-ditch: pull a signed integer out of the raw text
  const text = extractText(result);
  const m = text.match(/-?\d+/);
  if (m) return clamp(parseInt(m[0], 10), -10, 10);
  return null;
}

/* ───── small utilities ───── */

interface AiResult {
  response?: string;
  choices?: Array<{ message?: { content?: string } }>;
}

function extractText(result: AiResult | string | null | undefined): string {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (typeof result.response === "string") return result.response;
  const choice = result.choices?.[0]?.message?.content;
  return typeof choice === "string" ? choice : "";
}

/**
 * Strip surrounding quotes, asterisk-narration (e.g. *crack*), and dashes.
 * Replaces em/en dashes with commas to enforce the rock's voice rule.
 */
function sanitize(s: string): string {
  return s
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\*[^*]{1,40}\*/g, "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
