// index.ts — the Express server. This is the "thin proxy": its whole reason to exist is
// to hold the Anthropic API key server-side and expose ONE endpoint, POST /api/coach.
// The browser talks to this server; this server talks to Claude. The key never leaves here.

import "./env.js"; // MUST be first: loads server/.env into process.env before anything reads it
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { runCoach, runCoachStream, type ChatMessage } from "./coach.js";
import { verifyLicense, gumroadConfigured, matchesOurProduct } from "./gumroad.js";
import { getSupabaseUser, supabaseConfigured } from "./supabaseAuth.js";
import { getEntitlement, redeemForUser, grantByEmail, revokeByEmail, entitlementConfigured } from "./entitlement.js";
import { deleteAccountByToken, accountDeletionConfigured } from "./account.js";
import { notifyNewMessage, notifyConfigured } from "./notify.js";
import { accessBodySchema, coachBodySchema, notifyBodySchema } from "./validation.js";
import { timingSafeEqual } from "node:crypto";

const app = express();

// Parse JSON request bodies (the chat history arrives as JSON). Cap the size so a
// runaway client can't post megabytes.
app.use(express.json({ limit: "1mb" }));
// Gumroad's sale "ping" arrives as form-encoded data (not JSON), so parse that too.
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// CORS = which browser origins may call us. We allow only the Vite dev URLs by default
// (configurable via CORS_ORIGIN). This is a guardrail, not the security boundary — the
// key is safe because it lives here, not because of CORS.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5175")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, allowedHeaders: ["Content-Type", "x-access-token"] }));

// If deployed behind a reverse proxy / load balancer (Render, Heroku, Nginx, etc.), set
// TRUST_PROXY=1 so the rate limiter sees the real client IP instead of the proxy's. Off
// by default — enabling it permissively would let clients spoof their IP to dodge limits.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

// ── Global rate limit: a baseline cap on EVERY route ────────────────────────────────────
// No endpoint is ever unlimited (health check, root, and any future route included). The
// stricter per-route limiters further down (coach = paid Anthropic API; access/delete =
// sensitive) run ON TOP of this and trip first, so this is just the backstop.
//   IMPORTANT: behind a proxy (Render, etc.) set TRUST_PROXY so this keys off the REAL
//   client IP. Without it every request looks like it comes from the proxy's single IP,
//   and this limiter would throttle all your users together. Tunable via env.
const API_RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_MS) || 60_000; // 1 minute
const API_RATE_MAX = Number(process.env.API_RATE_MAX) || 60; // requests per IP per window

const defaultLimiter = rateLimit({
  windowMs: API_RATE_WINDOW_MS,
  limit: API_RATE_MAX,
  standardHeaders: "draft-7", // adds standard RateLimit-* headers (incl. Retry-After)
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many requests. Please slow down and try again in a minute.",
      retryAfter: Math.ceil(API_RATE_WINDOW_MS / 1000),
    });
  },
});

// Register it before any route so it covers all of them.
app.use(defaultLimiter);

// ── Abuse guards ──────────────────────────────────────────────────────────────────────
// /api/coach is unauthenticated (no logins — see spec). Two cheap protections stop a
// stranger or a runaway script from burning your API credits:
//   1) a per-IP rate limit, and
//   2) input caps (validateMessages) so one request can't smuggle a giant prompt.
// All limits are env-tunable so you can loosen/tighten without code changes.
const RATE_WINDOW_MS = Number(process.env.COACH_RATE_WINDOW_MS) || 60_000; // 1 minute
const RATE_MAX = Number(process.env.COACH_RATE_MAX) || 12; // requests per IP per window
const MAX_MESSAGES = Number(process.env.COACH_MAX_MESSAGES) || 40; // chat-history length cap
const MAX_CONTENT_CHARS = Number(process.env.COACH_MAX_CONTENT_CHARS) || 4000; // per message

// Per-IP rate limit. The handler returns OUR JSON shape (with `reply`) so the client
// renders it as a normal coach message — no special-casing needed on the frontend.
const coachLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  limit: RATE_MAX,
  standardHeaders: "draft-7", // adds standard RateLimit-* headers
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      reply:
        "You're sending messages faster than the coach allows right now. Give it a minute, then try again. (If anything hurts — sharp, radiating, or lingering pain — stop and see a physio.)",
      citations: [],
      error: true,
    });
  },
});

// ── Access gate ─────────────────────────────────────────────────────────────────────
// Access rides entirely on a signed-in Supabase account with an entitlement. The old
// shared BETA_ACCESS_CODES / signed-token paths were removed before the beta launch:
// a shared code (or a copied 180-day token) let anyone who ever saw it use paid server
// features forever, with no account and no way to revoke just them.
// The gate is active whenever Gumroad licensing is configured (i.e. in production).
const gateEnabled = gumroadConfigured;

// Slow down code-guessing: max 10 attempts per IP per 5 minutes.
const accessLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ ok: false, error: "Too many attempts. Wait a few minutes and try again." }),
});

// Gate middleware for protected endpoints (the coach). When the gate is on, the request
// must carry a Supabase session token from a signed-in user in the x-access-token header
// — that is now the ONLY accepted credential. We go one step further than "signed in":
// the account must also be ACTIVATED (entitlement 'beta' or 'paid'), so a free signup
// can't use paid server features. This is the server-side half of the paywall — the
// browser gate alone could be bypassed, this can't.
async function requireAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!gateEnabled) return next();
  const token = String(req.header("x-access-token") ?? "").trim();

  const user = await getSupabaseUser(token);
  if (user) {
    // If entitlements aren't wired up yet (older deploy), fall back to "signed in is
    // enough" so a valid user is never locked out by missing config.
    if (!entitlementConfigured) return next();
    const ent = await getEntitlement(user.id);
    if (ent !== "none") return next();
    return res.status(403).json({
      error: "Activation required.",
      reply: "Your account isn't activated yet. Enter your license key to unlock the program.",
      citations: [],
      locked: true,
    });
  }

  return res.status(401).json({
    error: "Access required.",
    reply: "This is locked. Sign in with your email to continue.",
    citations: [],
    locked: true,
  });
}

// Retired. This route used to mint a shareable signed token from a shared beta code (and,
// earlier still, from a Gumroad license). Both were copyable credentials that worked with
// no account, so there was no way to revoke one tester without revoking everyone. Access
// now rides entirely on a signed-in account: sign in with a magic link, then redeem the
// license onto that account (see /api/redeem). The route is kept only so any old client
// build gets a clear answer instead of a confusing 404.
app.post("/api/access", accessLimiter, (_req, res) => {
  return res.status(410).json({
    ok: false,
    error: "Access codes have been retired. Sign in with your email to continue.",
  });
});

// ── License redemption (bind a Gumroad key to THIS account) ───────────────────────────
// The heart of the anti-sharing design. A SIGNED-IN user posts their Gumroad license key.
// We (1) confirm who they are from their Supabase token, (2) verify the key is a real,
// non-refunded purchase of OUR product with Gumroad, then (3) stamp their account as
// 'paid' and BIND the key to it — so the same key can never activate a second account.
// Sharing the key now does nothing; sharing access means sharing your own email login.
app.post("/api/redeem", accessLimiter, async (req, res) => {
  const parsed = accessBodySchema.safeParse(req.body); // reuse: same { code } shape
  if (!parsed.success) return res.status(400).json({ ok: false, message: "Invalid request." });
  const key = parsed.data.code.trim();
  if (!key) return res.status(400).json({ ok: false, message: "Enter your license key." });

  // Who is asking? Must be a genuinely signed-in Supabase user.
  const token = String(req.header("x-access-token") ?? "").trim();
  const user = await getSupabaseUser(token);
  if (!user) return res.status(401).json({ ok: false, message: "Please sign in first, then enter your key." });

  if (!gumroadConfigured || !entitlementConfigured) {
    return res.status(503).json({ ok: false, message: "Activation isn't available right now — contact support." });
  }

  // 1) + 2) Verify the key is a real, non-refunded purchase.
  let result;
  try {
    result = await verifyLicense(key);
  } catch (err) {
    console.error("[/api/redeem] Gumroad verify error:", err);
    return res.status(502).json({ ok: false, message: "Couldn't check your license right now — try again in a moment." });
  }
  if (!result.valid) {
    return res.status(403).json({ ok: false, message: "That license key isn't valid (or the purchase was refunded). Check it and try again." });
  }

  // 3) Bind the key to THIS account. One key = one account, enforced in the database.
  const outcome = await redeemForUser(user.id, user.email, key);
  if (outcome === "ok") return res.json({ ok: true });
  if (outcome === "already-other") {
    return res.status(409).json({
      ok: false,
      message: "This license is already activated on another account. Sign in with the email you first used, or contact support to move it.",
    });
  }
  return res.status(500).json({ ok: false, message: "Couldn't activate right now — try again in a moment." });
});

// ── Gumroad sale ping (auto-unlock by email) ──────────────────────────────────────────
// Gumroad calls this on every sale/refund of our product. It's how a buyer gets access
// with NOTHING to paste: we record their email as paid, and when they sign in with that
// same email they're let straight in. Not a user-facing route, so it's not behind the
// access gate — instead it's locked with a secret that lives in the URL Lea pastes into
// Gumroad (…/api/gumroad/ping?secret=XXXX), compared in constant time so only Gumroad's
// configured ping can trigger it. Always answers 200 on handled cases so Gumroad doesn't
// retry-storm; the body says what happened for diagnostics.
app.post("/api/gumroad/ping", async (req, res) => {
  const secret = process.env.GUMROAD_PING_SECRET ?? "";
  const given = String(req.query.secret ?? "");
  const ok =
    secret.length > 0 &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return res.status(401).json({ ok: false });

  if (!entitlementConfigured) {
    console.error("[/api/gumroad/ping] received a sale but entitlements aren't configured (SUPABASE_URL / SERVICE_ROLE_KEY missing).");
    return res.status(200).json({ ok: true, skipped: "not_configured" });
  }

  // Gumroad ping fields (form-encoded). Only act on OUR product.
  const body = (req.body ?? {}) as Record<string, string>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const productId = String(body.product_id ?? "");
  const permalink = String(body.product_permalink ?? body.permalink ?? "");
  const refunded = String(body.refunded ?? "false") === "true";

  if (!matchesOurProduct(productId, permalink)) return res.json({ ok: true, skipped: "other_product" });
  if (!email) return res.json({ ok: true, skipped: "no_email" });

  const result = refunded ? await revokeByEmail(email) : await grantByEmail(email);
  return res.json({ ok: result === "ok", action: refunded ? "revoked" : "granted" });
});

// Pull the chat history off the request and validate it (Zod) BEFORE spending a single
// token on Claude. On a bad payload this sends the 400 itself and returns null, so each
// handler can just bail out; on success it returns the parsed messages. Both coach
// endpoints share this exact entry step, so it lives in one place.
function getValidMessages(req: express.Request, res: express.Response): ChatMessage[] | null {
  const parsed = coachBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
    return null;
  }
  return parsed.data.messages;
}

// Friendly root message. This server is an API only (no web pages), so visiting "/" in a
// browser would otherwise show "Cannot GET /", which looks broken. This explains it.
app.get("/", (_req, res) => {
  res.type("text/plain").send(
    "UNSTUCK Coach API — this is the backend, there's no page here.\n" +
      "The app talks to it. Health check: /api/health",
  );
});

// Simple health check — handy for "is the server up?" without calling Claude.
// Also reports which commit is running (Render sets RENDER_GIT_COMMIT) and
// whether the Supabase settings are visible — true/false only, never values —
// so a misconfigured deploy can be diagnosed from the outside.
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    model: process.env.COACH_MODEL ?? "claude-sonnet-4-5",
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "unknown",
    supabaseUrlSet: !!process.env.SUPABASE_URL,
    supabaseServiceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Auto-unlock-by-email (Gumroad ping) config visibility — booleans only.
    gumroadProductSet: gumroadConfigured,
    gumroadPingSecretSet: !!process.env.GUMROAD_PING_SECRET,
    // Email-notification config visibility (booleans only — never the values),
    // so a misconfigured notification setup can be diagnosed from the outside.
    notifyConfigured, // GMAIL_USER + GMAIL_APP_PASSWORD both present
    notifyWebhookSecretSet: !!process.env.NOTIFY_WEBHOOK_SECRET,
  });
});

// ── Account deletion (right to erasure) ───────────────────────────────────────────────
// A signed-in user sends their Supabase session token in x-access-token; we verify it,
// then delete their photos + auth user (which cascades to profiles + progress). Rate-
// limited like the access gate. If Supabase admin isn't configured, return 503 so the
// client falls back to an email deletion request — the user's right still works.
app.post("/api/account/delete", accessLimiter, async (req, res) => {
  if (!accountDeletionConfigured) {
    return res.status(503).json({ ok: false, reason: "not_configured" });
  }
  const token = String(req.header("x-access-token") ?? "").trim();
  if (!token) return res.status(401).json({ ok: false });
  const result = await deleteAccountByToken(token);
  if (result === "ok") return res.json({ ok: true });
  if (result === "unauthorized") return res.status(401).json({ ok: false });
  return res.status(500).json({ ok: false });
});

// ── New-message notification (Supabase Database Webhook → email the coach) ─────────────
// Supabase calls this when a row is inserted into coach_messages. We email the coach when
// a USER sends a message. This isn't a user-facing route, so it isn't behind requireAccess;
// instead it's locked with a shared secret (NOTIFY_WEBHOOK_SECRET) that the webhook sends
// in an x-webhook-secret header, compared in constant time so only Supabase can trigger it.
function webhookAuthorized(req: express.Request): boolean {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET ?? "";
  const given = String(req.header("x-webhook-secret") ?? "");
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.post("/api/coach/notify", async (req, res) => {
  if (!webhookAuthorized(req)) return res.status(401).json({ ok: false });
  // Supabase webhook payload: { type, table, record, old_record, schema }. Validate it.
  const parsed = notifyBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false });
  const record = parsed.data.record;
  if (record.sender !== "user") return res.json({ ok: true, skipped: true }); // don't email on our own replies
  // Await the send so the response (and the Supabase webhook delivery log) reports
  // whether the email actually went out. Always 200 so a failed send can't make
  // Supabase retry-storm; the body carries the real result for diagnostics.
  const result = await notifyNewMessage(String(record.body ?? ""));
  res.json({ ok: true, emailed: result.sent, configured: result.configured, ...(result.error ? { error: result.error } : {}) });
});

// The one real endpoint. Body shape: { messages: [{ role, content }, ...] }.
// coachLimiter runs first (rate limit), then we validate the body, then we call Claude.
app.post("/api/coach", requireAccess, coachLimiter, async (req, res) => {
  const messages = getValidMessages(req, res);
  if (!messages) return;

  try {
    const result = await runCoach(messages);
    res.json(result);
  } catch (err) {
    // Never leak internals (or the key) to the client. Log server-side, return a safe,
    // on-brand fallback that still carries the core safety message.
    console.error("[/api/coach] error:", err);

    // Special-case rate limits (HTTP 429). On the entry usage tier we can exceed the
    // input-tokens-per-minute cap. We surface this as a 429 with the upstream's
    // retry-after (seconds) so the client can show a calm "I'm busy" message and tell
    // the user how long to wait — rather than a generic failure.
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      const retryAfter = Number((err as { headers?: Record<string, string> })?.headers?.["retry-after"]) || 30;
      return res.status(429).json({
        reply: `I'm getting more questions than my current limit allows. Give me about ${retryAfter} seconds and ask again. (If anything hurts — sharp, radiating, or lingering pain — stop and see a physio.)`,
        citations: [],
        error: true,
        retryAfter,
      });
    }

    res.status(502).json({
      reply:
        "The coach is unavailable right now — try again in a moment. And if anything hurts (sharp, radiating, or lingering pain), stop and see a physio.",
      citations: [],
      error: true,
    });
  }
});

// Streaming version of the coach. Same guards (rate limit + validation), but instead of
// one JSON reply it sends Server-Sent Events: `delta` (text chunks), `searching` (a web
// search began), `done` (with citations), or `error`. The browser shows the answer as it
// types. Same friendly fallbacks as /api/coach.
app.post("/api/coach/stream", requireAccess, coachLimiter, async (req, res) => {
  const messages = getValidMessages(req, res);
  if (!messages) return;

  // SSE headers. no-transform stops proxies from buffering the stream.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { citations } = await runCoachStream(messages, {
      onText: (delta) => send("delta", { text: delta }),
      onSearch: () => send("searching", {}),
    });
    send("done", { citations });
  } catch (err) {
    console.error("[/api/coach/stream] error:", err);
    const status = (err as { status?: number })?.status;
    const message =
      status === 429
        ? "I'm getting more questions than my current limit allows. Give me a moment, then ask again. (If anything hurts - sharp, radiating, or lingering pain - stop and see a physio.)"
        : "The coach is unavailable right now - try again in a moment. And if anything hurts (sharp, radiating, or lingering pain), stop and see a physio.";
    send("error", { message });
  } finally {
    res.end();
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`UNSTUCK coach server listening on http://localhost:${port}`);
  console.log(`Model: ${process.env.COACH_MODEL ?? "claude-sonnet-4-5"} · allowed origins: ${allowedOrigins.join(", ")}`);
  console.log(`Limits: global ${API_RATE_MAX} req/IP per ${API_RATE_WINDOW_MS / 1000}s · coach ${RATE_MAX} req/IP per ${RATE_WINDOW_MS / 1000}s · max ${MAX_MESSAGES} msgs · ${MAX_CONTENT_CHARS} chars/msg`);
  console.log(`Access gate: ${gateEnabled ? "ON" : "OFF"} · Gumroad: ${gumroadConfigured ? "configured" : "off"} · Supabase auth: ${supabaseConfigured ? "configured" : "off"} · Email notify: ${notifyConfigured ? "configured" : "off"}`);
});
