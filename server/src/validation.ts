// validation.ts — Zod schemas for every request body the API accepts.
//
// Centralising input validation here means each route just parses and trusts the
// result: a malformed or oversized payload is rejected with a 400 BEFORE any work
// (or any token spend) happens. Unknown extra keys are stripped, not trusted.
import { z } from "zod";

const MAX_MESSAGES = Number(process.env.COACH_MAX_MESSAGES) || 40;
const MAX_CONTENT_CHARS = Number(process.env.COACH_MAX_CONTENT_CHARS) || 4000;

// POST /api/access — a beta code or Gumroad license key.
export const accessBodySchema = z.object({
  code: z.string().max(256).optional().default(""),
});

// POST /api/coach and /api/coach/stream — the chat history.
export const coachBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z
          .string()
          .trim()
          .min(1, "A message can't be empty.")
          .max(MAX_CONTENT_CHARS, `A message is too long (max ${MAX_CONTENT_CHARS} characters).`),
      }),
    )
    .min(1, "Request body must include a non-empty 'messages' array.")
    .max(MAX_MESSAGES, `Too many messages (max ${MAX_MESSAGES}). Clear the chat and start fresh.`),
});

// POST /api/coach/notify — the Supabase webhook payload. We only read `record`;
// any other top-level fields (type, table, schema, old_record) are ignored.
export const notifyBodySchema = z.object({
  record: z.object({
    sender: z.enum(["user", "coach"]).optional(),
    body: z.string().max(10_000).optional(),
  }),
});
