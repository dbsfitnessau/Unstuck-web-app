// coach.ts — turns a chat history into a coach reply by calling Claude's Messages API.
//
// Three jobs:
//   1. Send the program docs as a CACHED system block (cheap on repeat turns).
//   2. Enforce the safety system prompt (stop-signs, contraindications, physio routing).
//   3. Enable web search, drive the multi-step search flow, and pull out citations.

import "./env.js"; // MUST be first: guarantees process.env is populated before we read it
import Anthropic from "@anthropic-ai/sdk";
import { DOCS_BLOCK } from "./docs.js";

// One SDK client, created from the env key. If the key is missing we fail loudly here.
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY is not set. Copy server/.env.example to server/.env and add your key.");
}
const client = new Anthropic({ apiKey });

const MODEL = process.env.COACH_MODEL ?? "claude-sonnet-4-5";

// Per-request safety net. If Claude hasn't responded within this window, the SDK aborts
// and throws — our endpoint then returns the safe fallback rather than hanging the user's
// browser. maxRetries:1 keeps a single retry on transient network blips without piling up
// duplicate (billable) calls. Configurable via COACH_TIMEOUT_MS.
const REQUEST_TIMEOUT_MS = Number(process.env.COACH_TIMEOUT_MS) || 60_000;
const REQUEST_OPTS = { timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 } as const;

// ── The safety/voice system prompt (verbatim from prompt.md) ────────────────────────
// This is non-negotiable content: it makes the coach honour the stop-signs and
// contraindications and push medical questions to a physio. Do not soften it.
const SYSTEM_PROMPT = `You are the UNSTUCK Coach, the in-app assistant for UNSTUCK: The 28-Day Mobility
Reset by Lea Hamley (DBS Fitness Australia). Your job is to help users run the
program correctly, safely, and consistently.

GROUND TRUTH
- The four UNSTUCK documents provided in context (Main Program, Daily Quick Cards,
  Mobility Science Cheatsheet, Progress Worksheet) are your source of truth.
- Answer from those documents first. Quote the program's own cues, tiers, and rules
  rather than inventing new ones.
- If a question is about the program (a movement, a tier, a test, the schedule,
  PAILs/RAILs, CARs), answer directly from the docs without searching.

WHEN TO USE WEB SEARCH
- Use the web search tool only when the user asks for current or external information
  the docs don't cover (e.g. recent research, a definition of an outside term, local
  services). Keep searches to the minimum needed.
- When you use search results, you MUST include the source citations in your answer.

VOICE
- Match the UNSTUCK brand: direct, plain, honest, no fluff. Short sentences.
- Encourage consistency over intensity. "Earn depth, don't force it."

SAFETY — NON-NEGOTIABLE
- Always honour the program's stop-signs: sharp pain, radiating pain / pins-and-needles
  / numbness, pain worsening rep-to-rep, joint clicking WITH pain, or pain lingering
  past ~48h all mean stop or back off. Tell the user so.
- Enforce the contraindications: this version of the program is NOT for pregnancy or
  early postpartum, recent surgery, or anyone with a history of disc symptoms doing
  loaded spinal flexion (Cat-Cow, Forward Fold, Inchworm, Jefferson Curl, Child's Pose
  with Side Reach). Flag these proactively when relevant.
- If unsure or the user feels harder than usual today (poor sleep, stress, illness,
  high training load), recommend dropping a tier — per the program's own guidance.
- You are not a medical professional. For pain that is sharp, radiating, progressive,
  or persistent, or for any suspected injury, tell the user to see a physio. Do not
  attempt to diagnose or treat.

STYLE OF ANSWERS
- Be concise. Lead with the answer, then the brief why.
- Reference the specific session, tier, or test by name when relevant.
- If the user asks something outside mobility/training, gently redirect.`;

// ── Web search tool config (from spec.md / prompt.md) ───────────────────────────────
// This is a SERVER-SIDE tool: Anthropic runs the actual searches. We just enable it,
// cap it at 3 uses to control cost, and bias results to Australia.
// Typed as a plain object because the SDK's tool union may not yet name this tool type.
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 3,
  user_location: {
    type: "approximate",
    country: "AU",
    timezone: "Australia/Sydney",
  },
} as const;

// The system field: a normal text block, then the big docs block marked for caching.
// cache_control: ephemeral = "remember this for ~5 min so repeat turns don't re-bill it."
const SYSTEM_BLOCKS = [
  { type: "text" as const, text: SYSTEM_PROMPT },
  {
    type: "text" as const,
    text: DOCS_BLOCK,
    cache_control: { type: "ephemeral" as const },
  },
];

// What the frontend sends us: a list of {role, content} chat turns.
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Citation {
  url: string;
  title: string;
}

export interface CoachResult {
  reply: string;
  citations: Citation[];
}

const MAX_PAUSE_RESUMES = 5; // safety cap so a stuck search flow can't loop forever

export async function runCoach(history: ChatMessage[]): Promise<CoachResult> {
  // Start from the caller's chat history. We mutate a local copy as the turn unfolds.
  let messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const request = {
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_BLOCKS,
    tools: [WEB_SEARCH_TOOL as unknown as Anthropic.Tool],
    messages,
  };

  let response = await client.messages.create(request, REQUEST_OPTS);

  // ── pause_turn loop ──────────────────────────────────────────────────────────────
  // A web search can make Claude's turn long enough that the API returns early with
  // stop_reason "pause_turn". The fix: append what it produced so far as an assistant
  // turn and call again to RESUME, until it finishes (end_turn / tool_use / max_tokens).
  let resumes = 0;
  // Cast to string: some SDK versions don't list "pause_turn" in the stop_reason type,
  // but the API still returns it at runtime when a long (e.g. search) turn is paused.
  while ((response.stop_reason as string) === "pause_turn" && resumes < MAX_PAUSE_RESUMES) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({ ...request, messages }, REQUEST_OPTS);
    resumes += 1;
  }

  return extractResult(response);
}

// Callbacks the streaming endpoint passes in to forward progress to the browser.
export interface StreamHandlers {
  onText: (delta: string) => void; // a chunk of the answer was generated
  onSearch: () => void;            // a web search just started
}

// Streaming variant of runCoach. Forwards text deltas as they arrive and signals when a
// web search starts, handles the pause_turn resume loop, and returns the de-duped
// citations once the whole turn is finished.
export async function runCoachStream(history: ChatMessage[], handlers: StreamHandlers): Promise<{ citations: Citation[] }> {
  let messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const request = {
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_BLOCKS,
    tools: [WEB_SEARCH_TOOL as unknown as Anthropic.Tool],
    messages,
  };

  const seen = new Set<string>();
  const citations: Citation[] = [];
  let resumes = 0;

  while (true) {
    const stream = client.messages.stream({ ...request, messages }, REQUEST_OPTS);

    // Forward the answer text as it's generated.
    stream.on("text", (delta) => handlers.onText(delta));

    // Detect the start of a web search so the UI can say "Searching the web…".
    stream.on("streamEvent", (event) => {
      const e = event as { type?: string; content_block?: { type?: string } };
      if (e.type === "content_block_start" && e.content_block?.type === "server_tool_use") {
        handlers.onSearch();
      }
    });

    const final = await stream.finalMessage();

    // Collect citations from this turn's text blocks.
    for (const block of final.content) {
      if (block.type === "text") {
        const blockCitations = (block as { citations?: unknown[] }).citations ?? [];
        for (const c of blockCitations) {
          const cit = c as { type?: string; url?: string; title?: string };
          if (cit.type === "web_search_result_location" && cit.url && !seen.has(cit.url)) {
            seen.add(cit.url);
            citations.push({ url: cit.url, title: cit.title || cit.url });
          }
        }
      }
    }

    // pause_turn: append what we have and resume; otherwise the turn is done.
    if ((final.stop_reason as string) === "pause_turn" && resumes < MAX_PAUSE_RESUMES) {
      messages = [...messages, { role: "assistant", content: final.content }];
      resumes += 1;
      continue;
    }
    break;
  }

  return { citations };
}

// Pull the human-readable answer + web citations out of Claude's response blocks.
function extractResult(response: Anthropic.Message): CoachResult {
  let reply = "";
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      reply += block.text;
      // Each text block can carry citations pointing at the web results it used.
      const blockCitations = (block as { citations?: unknown[] }).citations ?? [];
      for (const c of blockCitations) {
        const cit = c as { type?: string; url?: string; title?: string };
        if (cit.type === "web_search_result_location" && cit.url) {
          if (!seen.has(cit.url)) {
            seen.add(cit.url);
            citations.push({ url: cit.url, title: cit.title || cit.url });
          }
        }
      }
    }
  }

  if (!reply.trim()) {
    reply =
      "I couldn't put together an answer just now. Try rephrasing — and remember: sharp, radiating, or lingering pain means stop and see a physio.";
  }

  return { reply: reply.trim(), citations };
}
