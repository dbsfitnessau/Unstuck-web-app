// index.ts — the Express server. This is the "thin proxy": its whole reason to exist is
// to hold the Anthropic API key server-side and expose ONE endpoint, POST /api/coach.
// The browser talks to this server; this server talks to Claude. The key never leaves here.

import "./env.js"; // MUST be first: loads server/.env into process.env before anything reads it
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { runCoach, runCoachStream, type ChatMessage } from "./coach.js";
import { signToken, verifyToken } from "./auth.js";
import { verifyLicense, gumroadConfigured, MAX_ACTIVATIONS } from "./gumroad.js";

const app = express();

// Parse JSON request bodies (the chat history arrives as JSON). Cap the size so a
// runaway client can't post megabytes.
app.use(express.json({ limit: "1mb" }));

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

// ── Beta access gate ────────────────────────────────────────────────────────────────
// A simple shared/per-tester access code locks the app during the private beta. Codes
// live in BETA_ACCESS_CODES (comma-separated) so you can add or revoke testers without a
// code change — just edit the env var and redeploy. If it's empty the gate is OFF (handy
// for local dev), so the app behaves exactly as before until you set codes in production.
const ACCESS_CODES = (process.env.BETA_ACCESS_CODES ?? "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
// The gate is active if there are beta codes OR Gumroad licensing is configured.
const gateEnabled = ACCESS_CODES.length > 0 || gumroadConfigured;

// Slow down code-guessing: max 10 attempts per IP per 5 minutes.
const accessLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ ok: false, error: "Too many attempts. Wait a few minutes and try again." }),
});

// Gate middleware for protected endpoints (the coach). When the gate is on, the request
// must carry a valid code in the x-access-token header. This protects your API spend even
// if someone bypasses the client UI.
function requireAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!gateEnabled) return next();
  const token = String(req.header("x-access-token") ?? "").trim();
  // Accept a raw beta code (back-compat for existing testers) OR a valid signed token.
  if (ACCESS_CODES.includes(token) || verifyToken(token)) return next();
  return res.status(401).json({
    error: "Access required.",
    reply: "This is locked. Enter your access code or license key to continue.",
    citations: [],
    locked: true,
  });
}

// The gate check the client calls. Validates a beta code OR a Gumroad license key, and on
// success returns a SIGNED session token to store (see auth.ts). Rate-limited to slow
// guessing/brute-forcing.
app.post("/api/access", accessLimiter, async (req, res) => {
  const input = String(req.body?.code ?? "").trim();

  if (!gateEnabled) return res.json({ ok: true, token: signToken({ kind: "open" }) });

  // 1) Beta access code.
  if (ACCESS_CODES.includes(input)) {
    return res.json({ ok: true, token: signToken({ kind: "beta" }) });
  }

  // 2) Gumroad license key.
  if (gumroadConfigured && input) {
    try {
      const result = await verifyLicense(input);
      if (result.valid && !result.overLimit) {
        return res.json({ ok: true, token: signToken({ kind: "license" }) });
      }
      if (result.overLimit) {
        return res.status(403).json({
          ok: false,
          reason: "device_limit",
          message: `This purchase has reached its device limit (${MAX_ACTIVATIONS} devices). Use one of your existing devices, or contact support to reset it.`,
        });
      }
    } catch (err) {
      console.error("[/api/access] Gumroad verify error:", err);
      return res.status(502).json({ ok: false, reason: "verify_failed", message: "Couldn't check your license right now — try again in a moment." });
    }
  }

  return res.status(401).json({ ok: false });
});

// Validate the body BEFORE spending a single token on Claude. Returns an error string if
// the payload is malformed or oversized, otherwise null.
function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "Request body must include a non-empty 'messages' array.";
  }
  if (messages.length > MAX_MESSAGES) {
    return `Too many messages (max ${MAX_MESSAGES}). Clear the chat and start fresh.`;
  }
  for (const m of messages) {
    if (!m || typeof m !== "object") return "Each message must be an object.";
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return "Each message 'role' must be 'user' or 'assistant'.";
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return "Each message 'content' must be a non-empty string.";
    }
    if (content.length > MAX_CONTENT_CHARS) {
      return `A message is too long (max ${MAX_CONTENT_CHARS} characters).`;
    }
  }
  return null;
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
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: process.env.COACH_MODEL ?? "claude-sonnet-4-5" });
});

// The one real endpoint. Body shape: { messages: [{ role, content }, ...] }.
// coachLimiter runs first (rate limit), then we validate the body, then we call Claude.
app.post("/api/coach", requireAccess, coachLimiter, async (req, res) => {
  const messages = req.body?.messages as ChatMessage[] | undefined;

  const validationError = validateMessages(messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const result = await runCoach(messages!);
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
  const messages = req.body?.messages as ChatMessage[] | undefined;

  const validationError = validateMessages(messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  // SSE headers. no-transform stops proxies from buffering the stream.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { citations } = await runCoachStream(messages!, {
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
  console.log(`Limits: ${RATE_MAX} req/IP per ${RATE_WINDOW_MS / 1000}s · max ${MAX_MESSAGES} msgs · ${MAX_CONTENT_CHARS} chars/msg`);
  console.log(`Access gate: ${gateEnabled ? "ON" : "OFF"} · beta codes: ${ACCESS_CODES.length} · Gumroad: ${gumroadConfigured ? "configured" : "off"}`);
});
