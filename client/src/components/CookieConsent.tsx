import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// CookieConsent.tsx - a one-time notice banner.
//
// Honesty matters here: the App currently uses ONLY essential storage (the
// sign-in session + a local cache of your progress). Essential storage doesn't
// legally require opt-in consent, so this is a clear NOTICE the user
// acknowledges - not a fake "accept tracking" prompt. If analytics/marketing
// cookies are added later, upgrade this to a real consent choice (accept /
// reject) before any non-essential cookie is set.

const KEY = "unstuck-cookie-ack";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage blocked - just don't show the banner */
    }
  }, []);

  function acknowledge() {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie notice">
      <p className="cookie-text small">
        We use only essential storage to keep you signed in and save your progress -
        no ads, no third-party tracking.{" "}
        <Link to="/legal/cookies">Cookie Policy</Link>
      </p>
      <button className="cookie-ok" onClick={acknowledge}>
        Got it
      </button>
    </div>
  );
}
