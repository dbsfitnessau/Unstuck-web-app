# Deploying UNSTUCK

The app is two pieces that deploy separately:

| Piece | What it is | How it's hosted |
| :-- | :-- | :-- |
| **`client/`** | The React app (static files after a build) | Any static host (Netlify, Vercel, Cloudflare Pages, Render Static) |
| **`server/`** | The Express coach proxy (a running Node process) | Any Node host (Render, Railway, Fly.io) |

The client talks to the server over HTTPS. The Anthropic API key lives **only** on the
server, set as an environment variable — never in the client build.

---

## Before you start

- A hosting account (this guide uses **Render**, which can host both pieces; any host works).
- Your `ANTHROPIC_API_KEY` (rotate it first if it's ever been shared — see README).
- Decide the two URLs you'll end up with, e.g.
  - server: `https://unstuck-coach.onrender.com`
  - client: `https://unstuck.onrender.com`

---

## Step 1 — Make the coach docs available to the server

The server reads the 4 program docs at startup. On a server-only deploy they won't be at
the repo root, so ship them **with the server**:

```bash
mkdir -p server/content
cp UNSTUCK_01_Main_Program_REVISED.md \
   UNSTUCK_01a_Daily_Quick_Cards_REVISED.md \
   UNSTUCK_02_Mobility_Science_Cheatsheet_REVISED.md \
   UNSTUCK_03_Progress_Worksheet_FirstTimer.md \
   server/content/
```

`docs.ts` automatically checks `server/content/` (then the repo root) — no code change needed.
Commit `server/content/` so it ships with the deploy. (The repo is private, so the program
docs are safe there.) Alternatively, set a `DOCS_DIR` env var pointing at wherever the docs live.

---

## Step 2 — Deploy the server (Node web service)

On Render: **New → Web Service**, point it at this repo, then:

| Setting | Value |
| :-- | :-- |
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |
| Environment variables | see below |

Environment variables:

```
ANTHROPIC_API_KEY = sk-ant-...        # your key
COACH_MODEL       = claude-sonnet-4-5 # or claude-opus-4-8
CORS_ORIGIN       = https://YOUR-CLIENT-URL   # fill in after Step 3 (no trailing slash)
TRUST_PROXY       = 1                  # host sits behind a proxy → real client IPs for rate limiting
BETA_ACCESS_CODES = code1,code2        # beta gate: codes that unlock the app (empty = open)
```

**Beta access gate:** set `BETA_ACCESS_CODES` to a comma-separated list of codes (e.g.
`alex-2026,sam-2026`). Visitors must enter one to use the app, and the coach rejects
requests without a valid code. Give each tester their own code so you can revoke one
(edit the list + redeploy) without affecting the others. Leave it **empty** to turn the
gate off (fully open).

Deploy, then hit `https://YOUR-SERVER-URL/api/health` — you should see `{"ok":true,...}`.

---

## Step 3 — Deploy the client (static site)

On Render: **New → Static Site**, same repo, then:

| Setting | Value |
| :-- | :-- |
| Root directory | `client` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Environment variable | `VITE_API_URL = https://YOUR-SERVER-URL` |

> `VITE_API_URL` is read at **build time**, so if you change it you must rebuild the client.

Single-page-app routing: deep links (e.g. `/worksheet`) must load the app, not 404.
- **Automatic fallback (in repo):** the build emits a `404.html` copy of `index.html`, which
  Render serves for unknown paths — so deep links work even with no dashboard config (they
  return a 404 *status* but the app boots and routes correctly).
- **Cleaner (recommended):** also add a Render **Rewrite** rule — Source `/*`, Destination
  `/index.html`, Action **Rewrite** — so unknown paths serve the app with a 200 status.
  (Netlify: a `_redirects` file with `/*  /index.html  200`. Vercel: a catch-all rewrite.)

---

## Step 4 — Connect the two

1. Copy the client URL from Step 3.
2. Set the server's `CORS_ORIGIN` to that exact URL and redeploy the server.
3. Open the client URL, open the Coach, ask a question. If it answers, you're live.

---

## Troubleshooting

- **Coach says "unavailable"** → check the server logs. Usual causes: missing/old API key,
  no API credits, or the per-minute rate limit (entry tier ≈ 1 request/min — raise your
  Anthropic usage tier for more).
- **Coach request blocked in the browser (CORS error)** → `CORS_ORIGIN` doesn't exactly
  match the client URL (watch for `http` vs `https` and trailing slashes).
- **Server won't boot, "Could not find the UNSTUCK docs"** → redo Step 1.
- **Deep links 404** → the SPA rewrite from Step 3 is missing.

---

## Going paid — Gumroad license keys (one-time purchase)

The app can unlock via a **Gumroad license key** instead of (or alongside) beta codes.
Flow: buyer pays on Gumroad → gets a license key → enters it in the app → the server
verifies it with Gumroad and unlocks. No passwords. A per-purchase **device cap** limits
sharing.

**1. In Gumroad:**
- Create the product (one-time). Under its settings, tick **"Generate a unique license
  key per sale"**.
- Find the **product ID** (Gumroad: product → ... → it's in the product's advanced
  settings / API; or via the API `GET /v2/products`).
- In the product's receipt/confirmation, tell buyers their license key unlocks the app at
  your app URL.

**2. On the Render *server* → Environment:**

| Key | Value |
| :-- | :-- |
| `GUMROAD_PRODUCT_ID` | your product's ID (turns license unlocking ON) |
| `SESSION_SECRET` | a long random string (keep it stable) — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MAX_ACTIVATIONS` | device cap per purchase (default 4) |

Save → redeploy. Beta codes keep working too (run both during the transition, then clear
`BETA_ACCESS_CODES` when the beta ends).

**Anti-sharing:** each new device that activates a key uses one of its `MAX_ACTIVATIONS`.
Once verified, that device gets a 180-day signed token and won't re-verify, so normal use
(phone + laptop) is fine; a key shared widely burns through its activations and stops.
This is a "good enough" deterrent without a database. For exact per-device control (named
devices, self-service "log out everywhere", resets), the next step is a small database
(Supabase) — ask when you want it.

**Hard content-lock (later):** today the program text still ships in the app bundle (soft
lock — the gate protects the coach/API and deters casual access). To make it a true
paywall, the gated content moves behind the authenticated API. That's a follow-up build.

---

*The key never ships to the browser — confirm by searching the built `client/dist` for
`sk-ant` (should find nothing).*
