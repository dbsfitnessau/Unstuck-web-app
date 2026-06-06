import { useState } from "react";

// Milestone 2: the coach is now REAL. Instead of a canned reply, this panel POSTs the
// chat history to our Express server (/api/coach), which calls Claude with the program
// docs + safety prompt + web search, and returns the answer (plus any source citations).
//
// The server URL is configurable via VITE_API_URL (set in client/.env for production).
// Locally it defaults to the dev server on port 8787 — no config needed.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

interface Citation {
  url: string;
  title: string;
}
interface Msg {
  role: "user" | "coach";
  text: string;
  citations?: Citation[];
}

// The opening message. It's a "coach" turn but we never send it to the API (the API
// requires the conversation to start with a user turn — see the filter in send()).
const GREETING: Msg = { role: "coach", text: "Ask me anything about your session today." };

export default function CoachPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    // Build the history the API expects: our "coach" role becomes "assistant", and we
    // drop any leading non-user turns (like the greeting) so it starts with the user.
    const apiMessages = next.map((m) => ({
      role: m.role === "coach" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));
    while (apiMessages.length && apiMessages[0].role !== "user") apiMessages.shift();

    try {
      const res = await fetch(`${API_URL}/api/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "coach",
          text: data.reply ?? "I didn't get a reply. Try again.",
          citations: Array.isArray(data.citations) ? data.citations : [],
        },
      ]);
    } catch {
      // Network/server-down case. Keep the safety message even in failure.
      setMsgs((m) => [
        ...m,
        {
          role: "coach",
          text: "Couldn't reach the coach — is the server running? If anything hurts (sharp, radiating, or lingering pain), stop and see a physio.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="coach-fab" onClick={() => setOpen(true)}>💬 Coach</button>

      {open && (
        <div className="coach-overlay" onClick={() => setOpen(false)}>
          {/* stopPropagation: clicking inside the sheet shouldn't close it */}
          <div className="coach-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="coach-head">
              <strong>UNSTUCK Coach</strong>
              <button className="checkbtn" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="coach-msgs">
              {msgs.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div>{m.text}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="msg-citations">
                      <span className="muted small">Sources</span>
                      {m.citations.map((c, j) => (
                        <a
                          key={j}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="citation"
                        >
                          {c.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="msg coach pending">Thinking… <span className="muted small">(searching the web if needed)</span></div>
              )}
            </div>
            <div className="coach-input">
              <input
                className="search-input"
                placeholder="e.g. Slept badly — what tier today?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={loading}
              />
              <button className="primary" onClick={send} disabled={loading}>
                {loading ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
