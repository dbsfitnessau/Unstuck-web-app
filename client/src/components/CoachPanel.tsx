import { useState } from "react";

// Milestone 1: this is a STUB. The chat UI is real, but instead of calling the
// Claude API it returns a canned reply. In Milestone 2 we swap the canned reply
// for a real fetch() to our Express backend (/api/coach).
interface Msg { role: "user" | "coach"; text: string; }

const CANNED_REPLY =
  "I'm the UNSTUCK coach (preview). In the next build I'll answer from the program and search the web when needed. For now: if today feels harder than usual — poor sleep, stress, illness — drop a tier. Sharp or radiating pain means stop and see a physio.";

export default function CoachPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "coach", text: "Ask me anything about your session today." },
  ]);

  function send() {
    const text = input.trim();
    if (!text) return;
    // Add the user's message, then a canned coach reply.
    setMsgs((m) => [...m, { role: "user", text }, { role: "coach", text: CANNED_REPLY }]);
    setInput("");
  }

  return (
    <>
      <button className="coach-fab" onClick={() => setOpen(true)}>💬 Coach</button>

      {open && (
        <div className="coach-overlay" onClick={() => setOpen(false)}>
          {/* stopPropagation: clicking inside the sheet shouldn't close it */}
          <div className="coach-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="coach-head">
              <strong>UNSTUCK Coach <span className="muted small">· preview</span></strong>
              <button className="checkbtn" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="coach-msgs">
              {msgs.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>{m.text}</div>
              ))}
            </div>
            <div className="coach-input">
              <input
                className="search-input"
                placeholder="e.g. Slept badly — what tier today?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="primary" onClick={send}>Send</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
