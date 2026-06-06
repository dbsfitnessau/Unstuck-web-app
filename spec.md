# UNSTUCK — App Spec

A digital companion for **UNSTUCK: The 28-Day Mobility Reset** (DBS Fitness Australia). Turns the four program documents into a single, simple app: a science cheatsheet, a testing area, the full program, and daily quick cards — with a Claude-powered coach that can answer questions and pull in current information via web search.

Keep it simple. Build the UI first with dummy data, then wire in Claude.

---

## 1. Requirements

### Content surfaces
The app has four main areas, mapped directly to the existing documents:

1. **Cheatsheet** — the Mobility Science primer (5 principles, vocabulary table, "what this is NOT", the 5-minute version, FAQ). Read-only reference.
2. **Testing Area** — the 7 field tests (Deep Squat, Wall Ankle, Sit & Reach, Wall Shoulder Flexion, Thomas, Seated T-Spine Rotation, Cossack). Day 0 vs Day 28 capture, pass/fail checks, numeric inputs, and a before/after scorecard.
3. **Program** — the full 28-day program: weekly schedule, Weeks 1–2 (Foundation) and Weeks 3–4 (Progression), with the 5 daily sessions each.
4. **Quick Cards** — the day-of session references (one card per day), with tier toggle 🟢 / 🟡 / 🔴.

### Cross-cutting features
- **Search** — single search box that queries across all four surfaces (cheatsheet, tests, program, cards).
- **Tier selection** — 🟢 Recreational / 🟡 Intermediate / 🔴 Athlete, applied to quick cards and program views.
- **Coach (Claude)** — a chat panel that answers user questions about the program ("should I drop a tier today?", "what's PAILs/RAILs?") and uses the **web search tool** to ground answers in current sources when relevant (e.g. "latest evidence on ankle dorsiflexion drills").
- **Stop-signs & safety** — the stop-sign rules and contraindications (pregnancy/postpartum, disc history, loaded spinal flexion) must be visible and the coach must enforce them, steering medical questions to a physio.

### Non-goals (keep it simple)
- No user accounts or cloud sync in the first build (local state only).
- No native mobile app — responsive web is enough.
- No photo storage backend (photo capture is optional/local-only, can be deferred).

---

## 2. Tech stack

| Layer | Choice | Notes |
| :---- | :---- | :---- |
| Frontend | **React** (Vite + TypeScript) | Single-page app. React Router for the four sections. |
| Styling | Plain CSS or a light utility setup | No heavy UI framework — keep it minimal. |
| State | React state + `localStorage` | Test results and tier preference persist locally. |
| Backend | **Express** (Node + TypeScript) | Thin server. Holds the Claude API key, proxies coach requests. |
| AI | **Claude Messages API** | `@anthropic-ai/sdk`. Web search tool enabled. Program docs sent as cached context. |
| Content | Markdown → parsed into structured JSON at build time | The four `.md` files are the source of truth. |

**Why a backend at all:** the Anthropic API key must never live in the browser. Express is a thin proxy — one endpoint (`POST /api/coach`) — nothing more.

### Repo shape
```
/client      React app (Vite)
/server      Express app
/content     The 4 UNSTUCK markdown docs (source of truth)
spec.md
```

---

## 3. Design guidelines

Match the DBS Fitness / UNSTUCK brand voice: blunt, honest, no fluff ("Don't Be Sh*t. Move better.").

- **Tone:** direct and plain. Short labels, no jargon without explanation.
- **Palette:** black/white base with a **single accent colour** (matches the cheatsheet illustration spec). High contrast.
- **Tiers:** consistent colour coding everywhere — 🟢 green, 🟡 amber, 🔴 red.
- **Typography:** one clean sans-serif. Large, legible body text — this gets read in a gym, on a phone, mid-session.
- **Layout:** mobile-first. Quick cards must be one-screen, glanceable, no scrolling-to-find-the-next-move.
- **Safety styling:** stop-signs and contraindications always use the 🛑 red treatment and are never buried.
- **Accessibility:** AA contrast minimum; tier meaning never conveyed by colour alone (always paired with the emoji/label).

---

## 4. Milestones

### Milestone 1 — UI with dummy data
Get all four surfaces rendering and navigable, backed by hardcoded/dummy data. No backend, no Claude yet.

- Scaffold Vite + React + TypeScript client.
- Four routes: Cheatsheet, Testing, Program, Quick Cards.
- Render each surface from dummy JSON (a slice of the real content is fine).
- Tier toggle (🟢/🟡/🔴) working on Quick Cards + Program.
- Cross-surface search box filtering the dummy content.
- Testing Area: forms for Day 0 / Day 28 with pass/fail + numeric fields, saved to `localStorage`, plus a simple scorecard.
- Coach chat panel UI present but stubbed (returns a canned reply).
- Apply design guidelines (palette, tiers, mobile-first).

**Done when:** you can click through all four sections and the testing flow on a phone-sized screen, with realistic-looking placeholder content.

### Milestone 2 — Connect Claude API with web search
Stand up the Express backend and make the coach real, using the [web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool).

- Express server with `POST /api/coach`, key from env (`ANTHROPIC_API_KEY`), never exposed to client.
- Call Messages API with:
  - the UNSTUCK program docs as system/context (use **prompt caching** so the docs aren't re-billed every turn),
  - a system prompt that **enforces the stop-signs and contraindications** and routes medical questions to a physio,
  - the **web search tool** enabled.
- Handle the server-tool flow: `pause_turn`, `web_search_tool_result`, and render Claude's **citations** (url + title) in the chat — citations are required when showing results to users.
- Wire the Milestone 1 chat panel to the real endpoint; show a loading state during searches.

**Web search tool config (reference):**
```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 3,
  "user_location": {
    "type": "approximate",
    "country": "AU",
    "timezone": "Australia/Sydney"
  }
}
```
- Model: `claude-opus-4-8` (or a cheaper Sonnet/Haiku for cost).
- Pricing note: web search is **$10 / 1,000 searches** plus token costs — keep `max_uses` low.

**Done when:** the coach answers a program question grounded in the docs, performs a web search when asked for current external info, and displays citations.

### Milestone 3 — Polish & persistence (optional, if needed)
Only if the first two land cleanly.

- Replace dummy content with the full parsed markdown for all four docs.
- Photo capture in the Testing Area (local only) + before/after radar/bar scorecard chart.
- Session reminders / timers for holds and PAILs/RAILs cycles.
- Light accessibility + responsive pass.

---

*Built from the UNSTUCK program by Lea Hamley — Mobility Lead, DBS Fitness.*
