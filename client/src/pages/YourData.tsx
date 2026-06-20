import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, getCoachToken } from "../state/supabase";
import { CONTACT_EMAIL } from "../data/legal";

// YourData.tsx - the user-facing privacy controls. This is what makes our
// privacy promises real and gives people the access/erasure rights the law
// requires (Privacy Act, GDPR, CCPA).
//
//   • See what we store.
//   • Request a copy of your data (email - we fulfil it manually).
//   • Sign out.
//   • Delete your account: calls the server's /api/account/delete, which uses
//     the admin key to remove the user and (because the database cascades on
//     delete) all their progress + photos. If that endpoint isn't deployed yet,
//     we fall back to an email erasure request so the right still works.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export default function YourData() {
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? "");
    });
  }, []);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  }

  const exportSubject = encodeURIComponent("Data access request");
  const exportBody = encodeURIComponent(
    `Hi,\n\nI'd like a copy of the personal data you hold for my account (${email}).\n\nThanks.`,
  );
  const eraseSubject = encodeURIComponent("Account deletion request");
  const eraseBody = encodeURIComponent(
    `Hi,\n\nPlease delete my account and all associated data (${email}).\n\nThanks.`,
  );

  async function deleteAccount() {
    setStatus("deleting");
    try {
      const token = await getCoachToken();
      const res = await fetch(`${API_URL}/api/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": token },
      });
      if (!res.ok) throw new Error(String(res.status));
      // Deleted server-side. Clear the local session + cache and confirm.
      if (supabase) await supabase.auth.signOut();
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
      setStatus("done");
    } catch {
      // Endpoint not available (or failed) → the erasure right still works by email.
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="legal">
        <h2 className="section-title">Account deleted</h2>
        <p className="legal-p">
          Your account, progress, and uploaded photos have been deleted. Thanks for
          giving UNSTUCK a go.
        </p>
        <button className="primary" onClick={() => (window.location.href = "/")}>
          Back to start
        </button>
      </div>
    );
  }

  return (
    <div className="legal">
      <Link className="legal-back" to="/legal">
        ← All policies
      </Link>
      <h2 className="legal-title">
        <span aria-hidden="true">🗂️</span> Your data &amp; account
      </h2>
      {email && <p className="small muted legal-updated">Signed in as {email}</p>}

      <h3 className="legal-h">What we store</h3>
      <ul className="legal-ul">
        <li>Your email address (for sign-in).</li>
        <li>Your program progress - worksheet log, session ticks, tier, assessment scores.</li>
        <li>Any photos you uploaded to the Assessment area (private to you).</li>
        <li>Your Coach conversation, to answer your questions.</li>
        <li>Your access/purchase record (that you unlocked the program).</li>
      </ul>
      <p className="small muted">
        Full detail is in the <Link to="/legal/privacy">Privacy Policy</Link>.
      </p>

      <h3 className="legal-h">Get a copy of your data</h3>
      <p className="legal-p">
        Request an export and we’ll send it to your email.
      </p>
      <a className="primary legal-btn" href={`mailto:${CONTACT_EMAIL}?subject=${exportSubject}&body=${exportBody}`}>
        Email a data request
      </a>

      <h3 className="legal-h">Sign out</h3>
      <button className="legal-btn-outline" onClick={signOut}>
        Sign out
      </button>

      <h3 className="legal-h">Delete your account</h3>
      <p className="legal-p">
        This permanently deletes your account, your progress, and your photos. It
        can’t be undone.
      </p>

      {status === "error" && (
        <div className="legal-note">
          We couldn’t delete your account automatically right now. You can still have
          it deleted - send us a request and we’ll action it:
          <br />
          <a href={`mailto:${CONTACT_EMAIL}?subject=${eraseSubject}&body=${eraseBody}`}>
            Email a deletion request
          </a>
        </div>
      )}

      {!confirming ? (
        <button className="legal-btn-danger" onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      ) : (
        <div className="legal-confirm">
          <p className="legal-p">
            <strong>Are you sure?</strong> This deletes everything for good.
          </p>
          <div className="legal-confirm-row">
            <button
              className="legal-btn-danger"
              onClick={deleteAccount}
              disabled={status === "deleting"}
            >
              {status === "deleting" ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button className="legal-btn-outline" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
