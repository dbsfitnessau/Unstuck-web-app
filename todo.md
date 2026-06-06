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

# ✅ Milestone 2 — Connect the Claude coach with web search (COMPLETE)

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
- [x] Coach answers a program question grounded in the docs (no web search needed). *(Verified: "slept badly → drop a tier", quoting the program's own guidance.)*
- [x] Coach performs a web search when asked for current external info, and shows citations. *(Verified: stretching-research question returned an answer + 4 real citations.)*
- [x] Coach refuses/redirects a medical question to a physio and keeps the stop-signs intact. *(Verified: sharp/radiating leg pain → "stop, see a physio", both stop-signs named.)*

> **Note (2026-06-06):** ✅ Milestone 2 complete and verified live. All three behaviours
> confirmed against the running server after API credits were added.
>
> **Operational note — rate limits / cost:** the 4 docs are ~40K tokens and ride on every
> request as cached context. On the entry usage tier (30K input tokens/min) the coach can
> only handle ~1 request/minute before hitting `rate_limit_error`. To raise throughput:
> advance usage tier (more credits), and/or route routine traffic to a cheaper model, and/or
> trim the cached docs. Revisit before any real user load.
>
> **Security:** the dev key was shared in chat — rotate it and update `server/.env`.

**Done when:** the coach answers a program question from the docs, web-searches when asked for current info, displays citations, and the key stays server-side. ✅ **ALL MET.**

---

# ⬜ Milestone 3 — Polish, hardening & persistence

**Goal:** take the working app + coach from "demo on my laptop" to something that
looks finished and could survive real users. Grouped so we can do a slice at a time.

## Coach polish (quick wins, surfaced while testing M2)
- [x] **Render Markdown in coach replies.** *(Added `react-markdown` + `remark-gfm`; links open in a new tab with `rel="noopener"`. Verified live — bold/headings/lists render, no raw `**`.)*
- [x] **Handle the rate-limit (429) nicely in the UI.** *(Server now returns 429 with a calm "I'm busy, give me ~Ns" message + `retryAfter` from the upstream `retry-after` header; client renders it like any reply.)*
- [x] **Persist the chat** across page reloads (localStorage), with a "Clear chat" button. *(Reuses `useLocalStorage` under key `unstuck-coach-chat`; verified survives reload, Clear resets to the greeting.)*
- [ ] **Stream the reply** token-by-token so it feels live instead of waiting for the whole
      answer (uses the SDK's streaming mode; the server would stream to the client).
- [ ] Distinguish "Thinking…" from "Searching the web…" so the loading text is honest.
      *(Best done together with streaming — the server only knows a search happened mid-turn.)*

## Cost, limits & abuse protection (do before any public/beta deploy)
- [x] **Protect `/api/coach`.** *(Per-IP rate limit via `express-rate-limit` — 12 req/min,
      env-tunable — returning our friendly JSON 429; plus input caps: max 40 messages,
      4000 chars/message, role validation, all rejected with 400 BEFORE any Claude call.
      Verified: validation 400s fire, limiter flips to 429 at the cap, happy path intact.)*
- [x] Add a request timeout/abort on the Claude call so a stuck turn fails fast. *(60s
      timeout + 1 retry on each Messages API call, via `COACH_TIMEOUT_MS`.)*
- [ ] **Raise coach throughput** *(partly done in code; rest is a billing decision).* The 4
      docs (~40K tokens) ride on every request; the entry tier allows 30K input tokens/min
      (~1 request/min). Code levers in place: model is env-configurable (`COACH_MODEL` →
      Haiku for cheap traffic) and input caps stop wasted spend. **Remaining (Lea's call):**
      advance the Anthropic usage tier so concurrent users don't hit the per-minute cap.
      (Not trimming the cached docs — they carry the load-bearing safety content.)

## Content depth
- [~] ~~Replace dummy content with the full parsed markdown (build-time parse).~~
      **Intentionally descoped.** The app's `program.ts` is already complete and faithful to
      the source docs (verified day-by-day), and it's *structured* (how / key-focus / why /
      per-tier / contraindications) — which a parse of human-prose markdown would only degrade.
      The coach already reads the raw docs (LLMs want prose); the app reads structure (UIs want
      fields). That split is correct, not a bug to fix. Real risk = drift if the docs change;
      handle that with a periodic consistency check, not a permanent fragile parser.
- [ ] Photo capture in the Testing Area (local only) + before/after chart. *(Deferred — Lea is
      collating photos to add later.)*
- [x] Session timers for holds and PAILs/RAILs cycles. *(New `Timer` component in the Worksheet:
      Hold countdown (30/45/60/90s) + guided PAILs·RAILs sequence (60s hold → 20s PAILs → 20s
      RAILs, 1–2 cycles), with beep + vibrate at each change. Deadline-based clock so it stays
      accurate under StrictMode/throttling. Verified live: accurate countdown + auto-advance
      Hold→PAILs→RAILs.)*

## Deploy
- [ ] Host the server (with `ANTHROPIC_API_KEY` set as a real env var, not a committed file)
      and the client; ship the 4 docs alongside the server so `docs.ts` can read them.
- [ ] Point the client at the live server via `VITE_API_URL`, and add the production URL to
      the server's `CORS_ORIGIN`.

## Housekeeping (small, discovered during M2)
- [ ] Remove the stale compiled `client/vite.config.js` + `vite.config.d.ts` (leftover build
      artifacts next to the real `vite.config.ts`) and gitignore `tsconfig.tsbuildinfo` so it
      stops showing up as a change.
- [ ] Light accessibility + responsive pass across all surfaces (incl. the coach sheet).

---

*Built from the UNSTUCK program by Lea Hamley — Mobility Lead, DBS Fitness.*
