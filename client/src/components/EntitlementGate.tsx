import { useEffect, useState, type ReactNode } from "react";
import { supabase, getEntitlement, redeemLicense, type Entitlement } from "../state/supabase";

// The SECOND lock, shown AFTER sign-in. Being signed in isn't enough: the
// account must also have PAID. With "auto-unlock by email" (Option B), a buyer
// does nothing here — when Gumroad pinged the server about their purchase, their
// email was marked paid, so signing in with that email lets them straight
// through. This screen only appears when we DON'T yet see a purchase for the
// email they signed in with (wrong email, or the ping is a few seconds behind),
// so it waits and re-checks on its own. A tucked-away license-key box is a
// manual fallback for the rare case the ping never arrives.
export default function EntitlementGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Entitlement | null>(null); // null = first check
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);

  // Manual fallback (hidden until asked for).
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Who are we signed in as? (Shown in the message so a wrong-email sign-in is obvious.)
  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  // First check, then keep re-checking for a short while: a purchase made moments
  // before sign-in may take a few seconds to arrive. Stops once paid, or after a
  // handful of tries (after which the user can Refresh manually).
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function loop() {
      const e = await getEntitlement();
      if (cancelled) return;
      setStatus(e);
      if (e === "none" && tries < 5) {
        tries += 1;
        setTimeout(loop, 4000);
      }
    }
    loop();
    return () => {
      cancelled = true;
    };
  }, []);

  async function recheck() {
    setChecking(true);
    setStatus(await getEntitlement());
    setChecking(false);
  }

  async function submitKey(e: React.FormEvent) {
    e.preventDefault();
    const value = key.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    const res = await redeemLicense(value);
    if (res.ok) {
      setStatus(await getEntitlement());
    } else {
      setError(res.message ?? "That didn't work. Check your key and try again.");
    }
    setBusy(false);
  }

  // First check still running.
  if (status === null) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1 className="gate-logo">UNSTUCK<span className="accent-dot">.</span></h1>
          <p className="gate-tag small muted">Checking your access…</p>
        </div>
      </div>
    );
  }

  // Paid/beta → show the app.
  if (status !== "none") return <>{children}</>;

  // Signed in, but no purchase found for this email yet.
  return (
    <div className="gate">
      <div className="gate-card">
        <h1 className="gate-logo">UNSTUCK<span className="accent-dot">.</span></h1>
        <p className="gate-tag small">
          <strong>We haven't found your purchase yet.</strong>
        </p>
        <p className="small muted">
          You're signed in as <strong>{email || "this email"}</strong>. If you just bought
          UNSTUCK, it can take a moment to come through — this page will unlock on its own.
          Make sure you signed in with the <strong>same email you used at checkout</strong>.
        </p>
        <button className="primary" onClick={recheck} disabled={checking}>
          {checking ? "Checking…" : "Check again"}
        </button>
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          Bought with a different email?{" "}
          <button className="reset-link" onClick={() => supabase?.auth.signOut()}>
            Sign out
          </button>{" "}
          and sign back in with that one.
        </p>

        {/* Manual fallback: only if someone really needs it. */}
        {showKey ? (
          <form onSubmit={submitKey} className="gate-form" style={{ marginTop: "1rem" }}>
            <input
              className="search-input"
              aria-label="License key"
              placeholder="Paste your Gumroad license key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoFocus
            />
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Activating…" : "Activate with key"}
            </button>
            {error && <p className="gate-error small">{error}</p>}
          </form>
        ) : (
          <p className="gate-legal small muted">
            <button className="reset-link" onClick={() => setShowKey(true)}>
              Have a license key? Enter it manually
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
