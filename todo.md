# UNSTUCK App — To-Do

---

# ✅ Milestone 1 — UI on dummy data (COMPLETE)

**Goal:** all surfaces rendering and navigable on dummy data, mobile-first, with a stubbed coach panel. No backend, no Claude yet.

> **Note on naming:** since the spec was written, two tabs were renamed as the app
> took shape — **Cheatsheet → Home** (now leads with a welcome + how-to and
> collapses the reference content into dropdowns) and **Quick Cards → Worksheet**
> (now a per-day tick-off + photo + colour-logging tool). Same content, clearer jobs.

## Setup
- [x] Scaffold Vite + React + TypeScript client in `/client`.
- [x] Add React Router with the core routes (Home, Program, Worksheet, Testing, Search).
- [x] Set up base styling: DBS palette (black/white + olive accent), mobile-first layout.
- [x] Add bottom nav / tab bar to switch between sections.

## Dummy data
- [x] Create `dummyContent.ts` with a realistic slice of each surface. *(Grew into full program data in `program.ts` — all days, both phases, 66 exercises.)*

## Home (was Cheatsheet)
- [x] Render the science principles, vocabulary table, and FAQ from dummy data (read-only).
- [x] Add welcome + "how to use the app" intro and collapse sections into dropdowns.

## Program
- [x] Render the weekly schedule table.
- [x] Render daily sessions (exercise / sets-reps / tier / notes) for Weeks 1–2 and 3–4.
- [x] Tier toggle (🟢 / 🟡 / 🔴) applied to the displayed tier.
- [x] Render full per-stretch detail (How / Key focus / Why / all three tier options / contraindications / image slot).

## Worksheet (was Quick Cards)
- [x] One-screen, glanceable per-day reference with tier toggle applied.
- [x] Show stop-signs / contraindications with the 🛑 red treatment, always visible.
- [x] Week tabs, per-stretch ticks, photo slot per stretch, per-day colour selection, re-do reset.

## Testing Area
- [x] List the 7 tests, each with its own checks/metric.
- [x] Test forms: pass/fail checkboxes + numeric fields per test.
- [x] Persist test results to `localStorage`.
- [x] Before/after scorecard summarising baseline vs latest.
- [x] Continuous re-test rounds (Day 0 / 28 / 56 / 84 …).

## Search
- [x] Single search box that filters across all surfaces (dummy content).

## Coach (stub)
- [x] Chat panel UI (message list + input).
- [x] Returns a canned reply for now (no API call).

## Design pass
- [x] Consistent tier colour coding everywhere (colour + emoji/label, never colour alone).
- [x] AA contrast + verified on a phone-sized screen.

**Done:** you can click through every section and complete the testing flow on a phone-sized screen with realistic content. ✅

---

# ⬜ Milestone 2 — Connect the Claude coach with web search

**Goal:** stand up the thin Express backend and make the coach real. The API key
lives ONLY on the server, never in the browser. Source of truth: `spec.md` §4 and
`prompt.md`.

## Backend setup (`/server`)
- [x] Scaffold an Express + TypeScript app in `/server`. *(tsx + ESM; `npm run dev`/`start`.)*
- [x] Add `@anthropic-ai/sdk` and read the key from `ANTHROPIC_API_KEY` (env / `.env`, git-ignored). **Never** ship the key to the client. *(Loaded via `src/env.ts` with `override:true` — the host shell had an empty `ANTHROPIC_API_KEY` that was shadowing ours.)*
- [x] Add `dotenv` + a `.env.example` documenting required vars.
- [x] Enable CORS for the Vite dev origin only. *(Allows `localhost:5173` + `5175`, configurable via `CORS_ORIGIN`.)*
- [x] Create a single endpoint: `POST /api/coach` that takes the chat history and returns the coach reply. *(Plus `GET /api/health`.)*

## Coach request (Messages API)
- [x] Load the four UNSTUCK docs (Main Program, Quick Cards, Cheatsheet, Worksheet) as a **cached** system block (`cache_control: ephemeral`) so they aren't re-billed every turn. *(`src/docs.ts`, read once at startup.)*
- [x] Add the system prompt from `prompt.md` — it **enforces the stop-signs + contraindications** and routes medical questions to a physio. *(Copied verbatim into `src/coach.ts`.)*
- [x] Enable the **web search tool** (`web_search_20250305`, `max_uses: 3`, `user_location` = Australia/Sydney) to keep cost down.
- [x] Choose the model. *(`claude-sonnet-4-5` default for cheaper routine traffic; swap to `claude-opus-4-8` via `COACH_MODEL` env.)*

## Server-tool flow
- [x] Handle the multi-step web-search flow: `pause_turn` and resuming the turn. *(Loop in `runCoach`, capped at 5 resumes.)*
- [x] Extract and return Claude's **citations** (url + title) alongside the answer — citations are required when showing web results to users. *(De-duped by URL.)*
- [x] Handle errors/timeouts gracefully and return a safe fallback message. *(502 + on-brand fallback that keeps the safety line.)*

## Wire up the frontend
- [x] Point the existing `CoachPanel` at `POST /api/coach` instead of the canned reply.
- [x] Add a loading / "searching…" state while the request (and any web search) runs.
- [x] Render citations under coach messages as tappable source links.
- [x] Add an env var (`VITE_API_URL`) so the client knows where the server is. *(Defaults to `http://localhost:8787`; added `client/.env.example` + `src/vite-env.d.ts`.)*

## Verify
- [x] Confirm the API key never appears in any client bundle or network request from the browser. *(Grepped `dist/` — clean; only the harmless server URL is bundled.)*
- [x] Server pipeline confirmed end-to-end: valid key/model/request reach Anthropic (auth OK), CORS preflight passes, bad requests return 400, errors fall back safely.
- [ ] ⛔ **BLOCKED on API credits** — Coach answers a program question grounded in the docs (no web search needed).
- [ ] ⛔ **BLOCKED on API credits** — Coach performs a web search when asked for current external info, and shows citations.
- [ ] ⛔ **BLOCKED on API credits** — Coach refuses/redirects a medical question to a physio and keeps the stop-signs intact.

> **Note (2026-06-06):** All code is complete and wired. The three live-behaviour checks
> above can't be run yet because the Anthropic account returns *"credit balance is too
> low."* Add credits at console.anthropic.com → Plans & Billing, restart the server, and
> these will pass. (Also: the dev key was shared in chat — rotate it.)

**Done when:** the coach answers a program question from the docs, web-searches when asked for current info, displays citations, and the key stays server-side.

---

# ⬜ Milestone 3 — Polish & persistence (optional, only if M1 + M2 land cleanly)

- [ ] Replace dummy content with the full parsed markdown for all four docs (build-time parse).
- [ ] Photo capture in the Testing Area (local only) + before/after chart (radar or bars).
- [ ] Session timers for holds and PAILs/RAILs cycles.
- [ ] Light accessibility + responsive pass.

---

*Built from the UNSTUCK program by Lea Hamley — Mobility Lead, DBS Fitness.*
