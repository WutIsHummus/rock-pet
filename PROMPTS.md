# PROMPTS.md

## Project Vision

**Initial Brief:** Build an AI-powered application on Cloudflare that satisfies four core requirements:
- **LLM**: Use an AI model for intelligent responses
- **Workflow/Coordination**: Orchestrate multi-step AI processes with state management
- **User Input**: Real-time chat interface for interaction
- **Memory/State**: Persistent state that survives across sessions

**Direction:** Make it silly and cute, not serious or portfolio-like. Deploy live on Cloudflare.

## Design & Implementation

### The Rock Concept

Instead of a typical chatbot, we built a living pet—a small grey pebble with a mood that changes based on how you interact with it. Everyone shares the same global rock, and it remembers what people have given it. The rock also has passing thoughts when alone, making it feel genuinely alive.

**Why this approach:** Reframing the "AI assistant" as a character with emotional stakes made the interaction more playful and memorable than standard chat patterns.

### Architecture

#### Backend (Cloudflare Workers + Durable Objects)

**LLM Requirement:** Llama 3.3 70B (via Cloudflare Workers AI) generates the rock's reactions and thoughts. Llama 3.1 8B acts as a fast fallback and as a structured-output classifier for sentiment scoring.

**Workflow/Coordination:** A single Durable Object (`RockAgent`) holds all state and serializes all operations:
- Processes incoming feed/say events
- Runs hourly decay tasks (energy ticks down, mood drifts)
- Generates passing thoughts every few hours when idle
- Enforces rate limits at three layers:
  - Per-IP connection gate (12 upgrades per 60s)
  - Per-IP message rate limit (20 messages per 60s)
  - Global LLM cap (120 calls per 60s to prevent runaway costs)

**Memory/State:** SQLite in Durable Object storage holds mood, energy, age, current thought, and a rolling buffer of recent feedings. State pushes to all connected clients in real-time via WebSocket.

#### Frontend (React + Vite on Cloudflare Pages)

**User Input:** Two text inputs:
- "Feed it something" — short praise, criticism, or observations that affect mood via sentiment scoring
- "Say something to it" — arbitrary utterances that trigger reactions

Real-time WebSocket connection streams state changes instantly. Desktop view: rock + bubble + stats on the left, chat forms + memory history on the right. Mobile: stacked single column.

### Key Design Decisions

#### Mood System
Initially attempted keyword-based sentiment. This collapsed into uniform responses ("this is on me now" template). 

**Solution:** Switched to semantic warmth scoring—a parallel LLM call that returns structured JSON (`{warmth: -10..10}`). Falls back to keyword matching if the LLM fails. This drives mood change in a way that actually responds to the nuance of what users say.

#### Voice & Personality
Early iterations produced repetitive, poetic responses ("waves," "shores," "eternity").

**Solutions:**
- Removed the "compare to old things" system prompt line
- Added 18 diverse few-shot examples across emotional ranges
- Explicitly forbade "this/these/someone" openers
- Loosened user prompts to allow fragments and one-word answers

#### Single-Screen Layout
The demo needed to fit on one screen without scrolling.

**Solutions:**
- Positioned bubble above the rock so the tail points down at it (same column, scales with viewport)
- Tightened spacing and hid scrollbars globally
- Right column holds only chat + memories (no rock art)

#### Rate Limiting & DDoS Protection
User requested protection against abuse.

**Implementation:**
- Per-connection throttle (1500ms between actions)
- Per-IP message rate limit (20/60s via Cloudflare rate limiter binding)
- Global LLM call cap (120/60s) to prevent cost runaway
- Connection upgrade gate (12 new connections per IP per 60s)

Prevents one user from flooding the rock with requests, one IP from opening 100 connections, or the global system from getting crushed.

## How It Addresses the Four Requirements

1. **LLM**: Llama 3.3 70B generates reactions and thoughts; Llama 3.1 8B scores sentiment. Both deployed via Cloudflare Workers AI.

2. **Workflow/Coordination**: Agents SDK + Durable Object serializes state, schedules hourly/3-hour tasks, and ensures updates are atomic.

3. **User Input**: React frontend with two forms; WebSocket streams state to all connected clients in real-time.

4. **Memory/State**: SQLite in Durable Object storage persists mood, energy, age, thought history, and feeding history. Data survives server restarts and powers the "single global rock" experience.

## Deployment

- **Backend:** Cloudflare Workers + Durable Object (wrangler deploy)
- **Frontend:** Cloudflare Pages + Vite (automatic Git deployment)
- **Live:** https://rock-pet.pages.dev

## Notable Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| LLM hanging during local dev | Fixed orphan wrangler processes; added account_id to wrangler.jsonc |
| Wrangler 3.x didn't support rate limiter bindings | Upgraded to wrangler v4 (stable) |
| Mood non-responsive to input | Switched from keyword sentiment to semantic scoring via parallel LLM call |
| Repetitive template responses | Added diverse few-shot examples; forbade certain openers |
| Single-screen layout without scroll | Positioned bubble above rock; tightened spacing |

---

**Created:** 2026-04-22  
**Framework:** Cloudflare Workers, Durable Objects, Workers AI, React 18, Vite, Tailwind CSS  
**Status:** Live and deployed
