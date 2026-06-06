import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocalStorage } from "../state/useLocalStorage";

// The in-app coach. It STREAMS: it POSTs the chat history to /api/coach/stream and the
// server sends back Server-Sent Events — text chunks as they're generated, a "searching"
// signal when a web search starts, and a final "done" with citations. The answer types
// out live instead of appearing all at once.
//
// Storage note: finished messages are persisted to localStorage (survive reload). The
// in-progress streaming text is kept in EPHEMERAL state so we don't write to localStorage
// on every token — only the completed message is saved.
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

const GREETING: Msg = { role: "coach", text: "Ask me anything about your session today." };

// Render coach text as Markdown (bold/headings/lists), with links opening safely.
function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a(props) {
            const { node, ...rest } = props;
            void node;
            return <a {...rest} target="_blank" rel="noopener noreferrer" />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

// Parse a Server-Sent Events response body, calling onEvent(event, data) per message.
async function consumeSSE(
  res: Response,
  onEvent: (event: string, data: { text?: string; citations?: Citation[]; message?: string }) => void,
) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    // Events are separated by a blank line.
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) {
        try {
          onEvent(event, JSON.parse(data));
        } catch {
          /* ignore malformed event */
        }
      }
    }
  }
}

export default function CoachPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState(""); // ephemeral, not persisted
  const [loadingLabel, setLoadingLabel] = useState("Thinking…");
  const [msgs, setMsgs] = useLocalStorage<Msg[]>("unstuck-coach-chat", [GREETING]);

  function clearChat() {
    setMsgs([GREETING]);
    setInput("");
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const next: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(next);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setLoadingLabel("Thinking…");

    // History for the API: our "coach" role → "assistant"; drop leading non-user turns.
    const apiMessages = next.map((m) => ({
      role: m.role === "coach" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));
    while (apiMessages.length && apiMessages[0].role !== "user") apiMessages.shift();

    let acc = ""; // accumulates the streamed answer (local, so 'done' has the full text)
    try {
      const res = await fetch(`${API_URL}/api/coach/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "stream failed");
      }

      let citations: Citation[] = [];
      await consumeSSE(res, (event, data) => {
        if (event === "delta") {
          acc += data.text ?? "";
          setStreamingText(acc);
        } else if (event === "searching") {
          setLoadingLabel("Searching the web…");
        } else if (event === "done") {
          citations = data.citations ?? [];
        } else if (event === "error") {
          acc = data.message ?? "Something went wrong.";
        }
      });

      // Commit the finished message to the persisted history.
      setMsgs((m) => [...m, { role: "coach", text: acc || "I didn't get a reply. Try again.", citations }]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          role: "coach",
          text: "Couldn't reach the coach - is the server running? If anything hurts (sharp, radiating, or lingering pain), stop and see a physio.",
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingText("");
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
              <div className="coach-head-actions">
                <button className="checkbtn" onClick={clearChat} disabled={streaming}>Clear</button>
                <button className="checkbtn" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>
            <div className="coach-msgs">
              {msgs.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  {m.role === "coach" ? <Markdown text={m.text} /> : <div>{m.text}</div>}
                  {m.citations && m.citations.length > 0 && (
                    <div className="msg-citations">
                      <span className="muted small">Sources</span>
                      {m.citations.map((c, j) => (
                        <a key={j} href={c.url} target="_blank" rel="noopener noreferrer" className="citation">
                          {c.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* The live, in-progress answer. Before the first token we show the status
                  label (Thinking… / Searching the web…); then the text types in. */}
              {streaming && (
                <div className="msg coach">
                  {streamingText ? (
                    <Markdown text={streamingText} />
                  ) : (
                    <span className="pending">{loadingLabel}</span>
                  )}
                </div>
              )}
            </div>
            <div className="coach-input">
              <input
                className="search-input"
                aria-label="Ask the coach a question"
                placeholder="e.g. Slept badly - what tier today?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={streaming}
              />
              <button className="primary" onClick={send} disabled={streaming}>
                {streaming ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
