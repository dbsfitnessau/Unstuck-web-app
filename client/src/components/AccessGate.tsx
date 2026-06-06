import { useState, type ReactNode } from "react";

// Beta access gate. Wraps the whole app: until the visitor enters a valid access code,
// they see only this screen. The code is checked by the SERVER (POST /api/access), which
// also protects the coach endpoint — so this isn't just a cosmetic client-side lock.
//
// Note: this is a "soft" gate for a private beta. The program *content* still ships in the
// app's code, so it deters casual visitors and protects your API spend, but it isn't a
// hard paywall. (That comes later with real accounts + server-gated content.)
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
const STORAGE_KEY = "unstuck-access";

// Where the rest of the app reads the saved token to authorise coach requests.
export function getAccessToken(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => !!getAccessToken());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        localStorage.setItem(STORAGE_KEY, data.token || value);
        setUnlocked(true);
      } else if (res.status === 429) {
        setError("Too many attempts. Wait a few minutes and try again.");
      } else {
        setError("That code didn't work. Check it and try again.");
      }
    } catch {
      setError("Couldn't reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="gate">
      <div className="gate-card">
        <h1 className="gate-logo">UNSTUCK<span className="accent-dot">.</span></h1>
        <p className="gate-tag small muted">Private beta — enter your access code to continue.</p>
        <form onSubmit={submit} className="gate-form">
          <input
            className="search-input"
            aria-label="Access code"
            placeholder="Access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
        {error && <p className="gate-error small">{error}</p>}
      </div>
    </div>
  );
}
