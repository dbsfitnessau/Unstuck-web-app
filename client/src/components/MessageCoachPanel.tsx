import { useEffect, useRef, useState } from "react";
import { supabase } from "../state/supabase";
import { loadThread, sendMessage, type CoachMessage } from "../state/coachMessages";

// The in-app MESSAGE coach: a real conversation with Lea, stored in Supabase.
// Unlike the AI coach (CoachPanel.tsx), this uses NO Anthropic API — so there's
// no per-message cost. The user sends messages; the coach replies by hand (via
// the Supabase dashboard, or a future admin inbox). RLS keeps each thread private.
//
// We load the thread when the sheet opens and poll lightly while it's open, so a
// reply from the coach appears without the user refreshing.
const POLL_MS = 10_000;
const MAX_LEN = 2000;

// Shown when the thread is empty, so the first-time user knows what this is.
const INTRO =
  "Hi! Send me a message about your training - a swap, a niggle, a question - and " +
  "I'll reply right here. I'm a real person, so it might take a little while.";

export default function MessageCoachPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false); // guards the poll from clobbering an in-flight send
  const tempId = useRef(0);

  // Load on open + poll while open.
  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = async () => {
      const thread = await loadThread();
      if (active && !sendingRef.current) setMsgs(thread);
    };
    setLoading(true);
    refresh().finally(() => {
      if (active) setLoading(false);
    });
    const id = setInterval(refresh, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setError("");
    setSending(true);
    sendingRef.current = true;
    setInput("");

    // Optimistic: show the message immediately while it saves.
    const optimisticId = `temp-${tempId.current++}`;
    const optimistic: CoachMessage = {
      id: optimisticId,
      user_id: "",
      sender: "user",
      body: text,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, optimistic]);

    const saved = await sendMessage(text);
    if (saved) {
      setMsgs((m) => m.map((x) => (x.id === optimisticId ? saved : x)));
    } else {
      // Roll back and hand the text back so nothing is lost.
      setMsgs((m) => m.filter((x) => x.id !== optimisticId));
      setInput(text);
      setError("Couldn't send - check your connection and try again.");
    }
    sendingRef.current = false;
    setSending(false);
  }

  if (!open) return null;

  return (
    <div className="coach-overlay" onClick={onClose}>
      {/* stopPropagation: clicking inside the sheet shouldn't close it */}
      <div className="coach-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <strong>Message your coach</strong>
          <div className="coach-head-actions">
            <button className="checkbtn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="coach-msgs" ref={scrollRef}>
          {!supabase ? (
            <p className="muted">Messaging is unavailable right now.</p>
          ) : loading && msgs.length === 0 ? (
            <span className="pending">Loading…</span>
          ) : msgs.length === 0 ? (
            <div className="msg coach">
              <div style={{ whiteSpace: "pre-wrap" }}>{INTRO}</div>
            </div>
          ) : (
            msgs.map((m) => (
              <div key={m.id} className={`msg ${m.sender}`}>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
              </div>
            ))
          )}
        </div>
        {error && <p className="muted small" style={{ padding: "0 var(--s-4)" }}>{error}</p>}
        <div className="coach-input">
          <input
            className="search-input"
            aria-label="Write a message to your coach"
            placeholder="Type your message…"
            maxLength={MAX_LEN}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={sending || !supabase}
          />
          <button className="primary" onClick={send} disabled={sending || !supabase}>
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
