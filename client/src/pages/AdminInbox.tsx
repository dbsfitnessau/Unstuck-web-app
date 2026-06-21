import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getIsAdmin,
  loadAllThreads,
  loadThreadFor,
  replyTo,
  type Thread,
  type CoachMessage,
} from "../state/coachMessages";

// The coach's inbox: list every user's message thread, open one, and reply.
// Access is enforced at the DATABASE (admin RLS policies), not just here — a
// non-admin who lands on /inbox gets no data back, so this is a real lock, not
// a UI-only one. The admin check below is just for showing a friendly screen.

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function AdminInbox() {
  const [admin, setAdmin] = useState<boolean | null>(null); // null = still checking
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [thread, setThread] = useState<CoachMessage[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getIsAdmin().then(async (ok) => {
      if (!active) return;
      setAdmin(ok);
      if (ok) setThreads(await loadAllThreads());
    });
    return () => {
      active = false;
    };
  }, []);

  async function openThread(t: Thread) {
    setSelected(t);
    setThread(await loadThreadFor(t.userId));
  }

  async function send() {
    const body = reply.trim();
    if (!body || !selected || busy) return;
    setBusy(true);
    const saved = await replyTo(selected.userId, body);
    if (saved) {
      setReply("");
      setThread((m) => [...m, saved]);
      setThreads(await loadAllThreads()); // refresh previews/ordering
    }
    setBusy(false);
  }

  if (admin === null) return <p className="muted">Loading…</p>;

  if (!admin) {
    return (
      <div>
        <h1>Inbox</h1>
        <p className="muted">This area is for the coach only.</p>
        <Link to="/home" className="link-back">← Back to home</Link>
      </div>
    );
  }

  // ── A single conversation ──
  if (selected) {
    return (
      <div className="admin-inbox">
        <button className="checkbtn" onClick={() => setSelected(null)}>← All messages</button>
        <h2>{selected.email ?? selected.userId.slice(0, 8) + "…"}</h2>
        <div className="coach-msgs admin-thread">
          {thread.map((m) => (
            <div key={m.id} className={`msg ${m.sender}`}>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
              <span className="muted small">{fmtTime(m.created_at)}</span>
            </div>
          ))}
        </div>
        <div className="coach-input">
          <input
            className="search-input"
            aria-label="Type your reply"
            placeholder="Type your reply…"
            maxLength={2000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={busy}
          />
          <button className="primary" onClick={send} disabled={busy}>
            {busy ? "…" : "Reply"}
          </button>
        </div>
      </div>
    );
  }

  // ── The list of threads ──
  return (
    <div className="admin-inbox">
      <div className="inbox-head">
        <h1>Inbox</h1>
        <button className="checkbtn" onClick={async () => setThreads(await loadAllThreads())}>
          Refresh
        </button>
      </div>
      {threads.length === 0 ? (
        <p className="muted">No messages yet.</p>
      ) : (
        <ul className="thread-list">
          {threads.map((t) => (
            <li key={t.userId}>
              <button className="thread-row" onClick={() => openThread(t)}>
                <span className="thread-who">
                  {t.email ?? t.userId.slice(0, 8) + "…"}
                  {t.unanswered && <span className="badge">needs reply</span>}
                </span>
                <span className="thread-preview muted">
                  {t.lastSender === "coach" ? "You: " : ""}
                  {t.lastBody.slice(0, 70)}
                </span>
                <span className="muted small">{fmtTime(t.lastAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
