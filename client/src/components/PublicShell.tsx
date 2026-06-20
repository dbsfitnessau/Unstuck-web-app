import { Link } from "react-router-dom";
import type { ReactNode } from "react";

// PublicShell - a minimal frame for pages that must be readable WITHOUT signing
// in (the legal/policy pages). It reuses the app's topbar + content styling but
// has no bottom nav or coach. A clear link sends visitors back to sign-in.
//
// Why this exists: the rest of the app lives behind the sign-in gate, but a
// public, paid product must let anyone read its Privacy Policy, Terms, etc.
// before they create an account or buy.

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="topbar-home" aria-label="Back to UNSTUCK">
          <h1>
            UNSTUCK<span className="accent-dot">.</span>
          </h1>
        </Link>
        <Link to="/" className="public-signin small">
          Sign in →
        </Link>
      </header>
      <div className="app-content public-content">{children}</div>
    </div>
  );
}
