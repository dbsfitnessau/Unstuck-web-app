// index.ts — the Express server. This is the "thin proxy": its whole reason to exist is
// to hold the Anthropic API key server-side and expose ONE endpoint, POST /api/coach.
// The browser talks to this server; this server talks to Claude. The key never leaves here.

import "./env.js"; // MUST be first: loads server/.env into process.env before anything reads it
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { runCoach, runCoachStream, type ChatMessage } from "./coach.js";

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
app.use(cors({ origin: allowedOrigins }));

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

// Simple health check — handy for "is the server up?" without calling Claude.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: process.env.COACH_MODEL ?? "claude-sonnet-4-5" });
});

// The one real endpoint. Body shape: { messages: [{ role, content }, ...] }.
// coachLimiter runs first (rate limit), then we validate the body, then we call Claude.
app.post("/api/coach", coachLimiter, async (req, res) => {
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
app.post("/api/coach/stream", coachLimiter, async (req, res) => {
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
});
