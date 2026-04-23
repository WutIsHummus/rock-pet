/**
 * Keyword-based sentiment fallback.
 *
 * The primary path for scoring how warm an input is uses a small LLM call
 * (`scoreWarmth` in `lib/llm.ts`). This module is only invoked when that LLM
 * call errors or returns malformed JSON — so it doesn't need to be clever, it
 * just needs to be robust enough that the rock's mood doesn't get stuck.
 */

const KIND_WORDS = [
  "love", "thank", "thanks", "please", "kind", "sweet", "cute", "nice",
  "beautiful", "pretty", "friend", "hi", "hello", "hey", "good", "hug",
  "pet", "warm", "soft", "happy", "proud", "smile", "lovely", "dear",
  "care", "gentle", "little", "buddy", "pal", "precious", "adorable",
];

const MEAN_WORDS = [
  "hate", "fuck", "stupid", "dumb", "ugly", "boring", "useless",
  "trash", "garbage", "die", "kill", "suck", "shit", "bitch", "idiot",
  "worthless", "pathetic", "lame",
];

export function keywordSentimentDelta(input: string): number {
  const lc = ` ${input.toLowerCase()} `;
  let score = 0;
  for (const w of KIND_WORDS) {
    if (lc.includes(` ${w} `) || lc.includes(` ${w},`) || lc.includes(`${w}!`) || lc.includes(` ${w}.`)) {
      score += 1;
    }
  }
  for (const w of MEAN_WORDS) {
    if (lc.includes(w)) score -= 1;
  }
  // Phrases like "i love you" / "i adore u" get a small bonus
  if (/\bi\s+(love|adore|like)\s+(you|u|this rock)/.test(lc)) score += 2;
  return clamp(score * 3, -10, 10);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
