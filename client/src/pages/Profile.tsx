import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../state/supabase";
import { useSyncedStorage } from "../state/useSyncedStorage";
import { getIsAdmin } from "../state/coachMessages";
import { CONTACT_EMAIL } from "../data/legal";

// Profile — opened by tapping the 💪 icon in the top bar (top-right); the
// UNSTUCK logo (top-left) returns home. Personal details + goals save to the
// same synced storage the rest of the app uses (local first, then mirrored to
// the user's cloud account), so they follow the user across devices. Email
// comes from the sign-in account and isn't editable here.

interface ProfileData {
  name: string;
  phone: string;
  dob: string;
  goals: string;
}
const EMPTY: ProfileData = { name: "", phone: "", dob: "", goals: "" };

export default function Profile() {
  const [profile, setProfile] = useSyncedStorage<ProfileData>("unstuck:profile", EMPTY);
  const [email, setEmail] = useState("");
  const [admin, setAdmin] = useState(false); // shows the coach inbox link

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? ""));
    getIsAdmin().then(setAdmin);
  }, []);

  // Merge over EMPTY so every field exists even for older saved data.
  const set = (patch: Partial<ProfileData>) => setProfile((p) => ({ ...EMPTY, ...p, ...patch }));

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="profile-page">
      <h2 className="section-title">Profile</h2>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Personal details</h3>
        <label className="field">
          <span className="field-label">Name</span>
          <input type="text" value={profile.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" />
        </label>
        <label className="field">
          <span className="field-label">Phone</span>
          <input type="tel" value={profile.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Mobile number" />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" value={email} readOnly disabled />
          <span className="field-hint small muted">Your sign-in email - can't be changed here.</span>
        </label>
        <label className="field">
          <span className="field-label">Date of birth</span>
          <input type="date" value={profile.dob} onChange={(e) => set({ dob: e.target.value })} />
        </label>
        <p className="field-hint small muted">Changes save automatically.</p>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Your goals</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          What are you working toward? Keep it here to stay focused.
        </p>
        <textarea
          className="goals-input"
          rows={5}
          value={profile.goals}
          onChange={(e) => set({ goals: e.target.value })}
          placeholder="e.g. Touch my toes pain-free, hold a deep squat for 2 minutes, get back to running without stiffness…"
        />
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Contact us</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          Questions, feedback, or need a hand? We'd love to hear from you.
        </p>
        <a className="contact-email" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("UNSTUCK enquiry")}`}>
          Email DBS Fitness Australia
        </a>
      </section>

      {admin && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Coach</h3>
          <p className="small muted" style={{ marginTop: 0 }}>
            Read and reply to messages from your users.
          </p>
          <Link to="/inbox" className="contact-email">Open the message inbox</Link>
        </section>
      )}

      <section className="card">
        <button className="legal-btn-outline" onClick={signOut}>Sign out</button>
      </section>

      <p className="small muted profile-foot">
        Manage your data or delete your account on the <Link to="/your-data">Your data</Link> page.
      </p>
    </div>
  );
}
