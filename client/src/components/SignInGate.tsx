import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../state/supabase";
import { pullAll } from "../state/sync";
import AccessGate from "./AccessGate";

// The front door. Replaces the beta access-code gate with real accounts:
//
//   1. Visitor types their email → Supabase emails them a sign-in link.
//   2. They tap the link → land back here with a session. No passwords.
//   3. First thing after sign-in we pull their cloud progress down (and
//      migrate any progress this browser made before accounts existed).
//
// Transition safety net: if the build has no Supabase config (old local
// builds), we fall back to the legacy AccessGate so the app still opens.
export default function SignInGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<boolean | null>(null); // null = still checking
  const [synced, setSynced] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Track the session: once on load (this also catches the magic-link
  // redirect), then live via the auth listener (sign-in, sign-out, refresh).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
      if (!s) setSynced(false); // signed out → next sign-in must re-sync
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Signed in → pull cloud progress BEFORE showing the app, so every screen
  // mounts with the user's real data already in place.
  useEffect(() => {
    if (!session || synced) return;
    let cancelled = false;
    pullAll().finally(() => {
      if (!cancelled) setSynced(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session, synced]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || busy || !supabase) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("rate")
          ? "Too many link requests — wait a minute and try again."
          : "Couldn't send the link. Check the email address and try again.",
      );
    } else {
      setSent(true);
    }
  }

  // No Supabase config in this build → legacy access-code gate.
  if (!supabase) return <AccessGate>{children}</AccessGate>;

  // Checking the session, or pulling progress right after sign-in.
  if (session === null || (session && !synced)) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1 className="gate-logo">UNSTUCK<span className="accent-dot">.</span></h1>
          <p className="gate-tag small muted">{session ? "Syncing your progress…" : "Loading…"}</p>
        </div>
      </div>
    );
  }

  if (session) return <>{children}</>;

  return (
    <div className="gate">
      <div className="gate-card">
        <h1 className="gate-logo">UNSTUCK<span className="accent-dot">.</span></h1>
        {sent ? (
          <>
            <p className="gate-tag small">
              <strong>Check your email.</strong>
            </p>
            <p className="small muted">
              We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on
              this device and you're in. (Check spam if it's not there in a minute.)
            </p>
            <button className="reset-link" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <p className="gate-tag small muted">
              Sign in with your email — we'll send you a link, no password needed.
            </p>
            <form onSubmit={sendLink} className="gate-form">
              <input
                className="search-input"
                type="email"
                autoComplete="email"
                aria-label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <button className="primary" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
            {error && <p className="gate-error small">{error}</p>}
          </>
        )}
        <p className="gate-legal small muted">
          <a href="/legal/privacy">Privacy</a> · <a href="/legal/terms">Terms</a> ·{" "}
          <a href="/legal/health-disclaimer">Health disclaimer</a>
        </p>
      </div>
    </div>
  );
}
