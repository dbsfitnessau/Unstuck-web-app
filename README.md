# UNSTUCK — Web App

The digital companion for **UNSTUCK: The 28-Day Mobility Reset** (DBS Fitness Australia).

> Don't Be Sh*t. Move better.

## What's here

- **`client/`** — the React app (Vite + TypeScript). All surfaces running on dummy data.
- **`server/`** — the thin Express proxy for the Claude coach (Milestone 2). Holds the API key; one endpoint, `POST /api/coach`.
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

**1. Frontend (the app itself):**

```bash
cd client
npm install
npm run dev
```

Then open the local URL Vite prints (e.g. `http://localhost:5173`).

**2. Coach backend (Milestone 2 — needed for the chat coach to work):**

```bash
cd server
npm install
cp .env.example .env      # then paste your ANTHROPIC_API_KEY into .env
npm run dev
```

The server runs on `http://localhost:8787`. The app talks to it automatically (no
client config needed in local dev). The API key lives **only** in `server/.env`, which
is gitignored — it never reaches the browser or the repo.

> Requires Anthropic API **credits** on the account. If the coach returns
> "unavailable", check the server log — a low credit balance is the usual cause.

## Milestones

- **M1 — UI on dummy data** ✅ — all surfaces rendering and navigable, mobile-first.
- **M2 — Claude coach** ⬜ — a thin Express proxy holds the API key and the coach answers questions grounded in the program docs, with web search + citations.
- **M3 — Polish & persistence** ⬜ — full content parse, photo capture, timers.

## Safety note

The stop-signs, the tier system (🟢 Recreational / 🟡 Intermediate / 🔴 Athlete), and the contraindications are load-bearing content — do not soften or drop them. CARs and PAILs/RAILs are from Dr Andreo Spina's Functional Range Conditioning (FRC).

When the coach backend lands, the `ANTHROPIC_API_KEY` lives **only** on the server, never in the client.

---

*Built from the UNSTUCK program by Lea Hamley — Mobility Lead, DBS Fitness.*
