import { useEffect, useState, type ReactNode } from "react";

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

// Call this when the token is no longer valid (e.g. the server rejected it with 401
// because the code was revoked). It clears the token and tells the gate to re-lock with
// a "you've been logged out" message. Used by the coach when it gets a 401.
export function lockApp() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("unstuck:locked"));
}

export default function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => !!getAccessToken());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // True when the session was unlocked but the token later expired / was cleared /
  // revoked — so we can show a "locked again" message instead of the first-time one.
  const [reLocked, setReLocked] = useState(false);

  // Re-lock the app if the token disappears mid-session: either the coach hit a 401
  // (lockApp() fires "unstuck:locked"), or the token was cleared in another tab (the
  // browser's native "storage" event).
  useEffect(() => {
    // Both triggers do the same thing: drop back to the locked screen with the
    // "locked again" message.
    function relock() {
      setUnlocked(false);
      setReLocked(true);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && !e.newValue) relock();
    }
    window.addEventListener("unstuck:locked", relock);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("unstuck:locked", relock);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

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
        setReLocked(false);
        setUnlocked(true);
      } else if (res.status === 403 && data.message) {
        // e.g. the purchase has hit its device limit.
        setError(data.message);
      } else if (res.status === 429) {
        setError("Too many attempts. Wait a few minutes and try again.");
      } else if (res.status === 502 && data.message) {
        setError(data.message);
      } else {
        setError("That code or license key didn't work. Check it and try again.");
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
        <p className="gate-tag small muted">
          {reLocked
            ? "UNSTUCK is locked - enter your access code or license key."
            : "Enter your access code or license key to continue."}
        </p>
        <form onSubmit={submit} className="gate-form">
          <input
            className="search-input"
            aria-label="Access code or license key"
            placeholder="Access code or license key"
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
