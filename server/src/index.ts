// index.ts — the Express server. This is the "thin proxy": its whole reason to exist is
// to hold the Anthropic API key server-side and expose ONE endpoint, POST /api/coach.
// The browser talks to this server; this server talks to Claude. The key never leaves here.

import "./env.js"; // MUST be first: loads server/.env into process.env before anything reads it
import express from "express";
import cors from "cors";
import { runCoach, type ChatMessage } from "./coach.js";

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

// Simple health check — handy for "is the server up?" without calling Claude.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: process.env.COACH_MODEL ?? "claude-sonnet-4-5" });
});

// The one real endpoint. Body shape: { messages: [{ role, content }, ...] }.
app.post("/api/coach", async (req, res) => {
  const messages = req.body?.messages as ChatMessage[] | undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Request body must include a non-empty 'messages' array." });
  }

  try {
    const result = await runCoach(messages);
    res.json(result);
  } catch (err) {
    // Never leak internals (or the key) to the client. Log server-side, return a safe,
    // on-brand fallback that still carries the core safety message.
    console.error("[/api/coach] error:", err);
    res.status(502).json({
      reply:
        "The coach is unavailable right now — try again in a moment. And if anything hurts (sharp, radiating, or lingering pain), stop and see a physio.",
      citations: [],
      error: true,
    });
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`UNSTUCK coach server listening on http://localhost:${port}`);
  console.log(`Model: ${process.env.COACH_MODEL ?? "claude-sonnet-4-5"} · allowed origins: ${allowedOrigins.join(", ")}`);
});
