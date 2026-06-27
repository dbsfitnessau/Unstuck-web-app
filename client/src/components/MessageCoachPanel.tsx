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
// localStorage key holding an ISO timestamp. "Clear" sets it to the latest shown
// message's time, and the panel then hides anything at/older than it. The messages
// are NOT deleted — every one stays in the database and the coach's inbox; this
// only changes what THIS user sees in their own panel (and only on this device).
const CLEARED_KEY = "unstuck:coach-cleared-at";

// Shown when the thread is empty, so the first-time user knows what this is.
const INTRO =
  "Hi! Send me a message about your training - a swap, a niggle, a question - and " +
  "I'll reply right here. I'm a real person, so it might take a little while.";

// Auto-acknowledgement shown (UI-only, not stored) whenever the user's latest
// message hasn't been answered yet - reassurance that it landed, since the human
// reply comes later. It disappears once a real coach reply arrives.
const ACK = "Thanks for your message. We will respond to you soon.";

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
      // Hide anything at/older than the user's "cleared" cutoff (compare as epoch
      // ms so any ISO format works). The DB rows are untouched.
      const clearedAt = localStorage.getItem(CLEARED_KEY);
      const cutoff = clearedAt ? new Date(clearedAt).getTime() : 0;
      const visible = cutoff ? thread.filter((m) => new Date(m.created_at).getTime() > cutoff) : thread;
      if (active && !sendingRef.current) setMsgs(visible);
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

  // Clear the user's VIEW only. Record a cutoff (the latest shown message's time) so
  // the thread stays cleared across reloads/polls. Nothing is deleted: every message
  // remains in the database and the coach's inbox.
  function clearView() {
    const cutoff = msgs.length ? msgs[msgs.length - 1].created_at : new Date().toISOString();
    localStorage.setItem(CLEARED_KEY, cutoff);
    setMsgs([]);
    setInput("");
    setError("");
  }

  if (!open) return null;

  return (
    <div className="coach-overlay" onClick={onClose}>
      {/* stopPropagation: clicking inside the sheet shouldn't close it */}
      <div className="coach-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <strong>Message your coach</strong>
          <div className="coach-head-actions">
            <button className="checkbtn" onClick={clearView} disabled={msgs.length === 0}>Clear</button>
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
            <>
              {msgs.map((m) => (
                <div key={m.id} className={`msg ${m.sender}`}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                </div>
              ))}
              {/* Auto-ack notification (not a chat bubble) under the user's latest
                  unanswered message. */}
              {msgs[msgs.length - 1].sender === "user" && (
                <p className="coach-ack">{ACK}</p>
              )}
            </>
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
