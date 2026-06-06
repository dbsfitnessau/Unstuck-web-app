# UNSTUCK — Web App

The digital companion for **UNSTUCK: The 28-Day Mobility Reset** (DBS Fitness Australia).

> Don't Be Sh*t. Move better.

## What's here

- **`client/`** — the React app (Vite + TypeScript). Milestone 1: all surfaces running on dummy data.
- **`spec.md`** — the app spec (requirements, tech stack, milestones).
- **`prompt.md`** — the Claude coach system prompt (Milestone 2).
- **`todo.md`** — milestone to-do list and progress.

## Surfaces

| Tab | What it does |
| :-- | :-- |
| **Home** | Welcome, how-to, and the science cheatsheet (principles, vocab, FAQ) in dropdowns. |
| **Program** | The full 28-day program — weekly schedule + per-day sessions with full per-stretch detail and tier options. |
| **Worksheet** | Per-day tick-off: choose your colour, check off each stretch, add a photo, log effort/load. |
| **Testing** | The 7 field tests with continuous re-test rounds (Day 0 / 28 / 56 …) and a before/after scorecard. |
| **Search** | Filters across every surface. |
| **Coach** | Chat panel — stubbed in M1, becomes a real Claude-powered coach in M2. |

## Running the app

```bash
cd client
npm install
npm run dev
```

Then open the local URL Vite prints (e.g. `http://localhost:5173`).

## Milestones

- **M1 — UI on dummy data** ✅ — all surfaces rendering and navigable, mobile-first.
- **M2 — Claude coach** ⬜ — a thin Express proxy holds the API key and the coach answers questions grounded in the program docs, with web search + citations.
- **M3 — Polish & persistence** ⬜ — full content parse, photo capture, timers.

## Safety note

The stop-signs, the tier system (🟢 Recreational / 🟡 Intermediate / 🔴 Athlete), and the contraindications are load-bearing content — do not soften or drop them. CARs and PAILs/RAILs are from Dr Andreo Spina's Functional Range Conditioning (FRC).

When the coach backend lands, the `ANTHROPIC_API_KEY` lives **only** on the server, never in the client.

---

*Built from the UNSTUCK program by Lea Hamley — Mobility Lead, DBS Fitness.*
