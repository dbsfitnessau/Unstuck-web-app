import { Link } from "react-router-dom";
import { ENTITY, CONTACT_EMAIL } from "../data/legal";

// Footer.tsx — sits at the bottom of the scrolling content on every screen.
// Gives users a permanent, findable path to the legal pages (a requirement for
// a public, paid site) without cluttering the bottom tab bar.

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="Legal and policies">
        <Link to="/legal/privacy">Privacy</Link>
        <Link to="/legal/terms">Terms</Link>
        <Link to="/legal/health-disclaimer">Health disclaimer</Link>
        <Link to="/legal/refunds">Refunds</Link>
        <Link to="/legal/cookies">Cookies</Link>
        <Link to="/legal/accessibility">Accessibility</Link>
        <Link to="/legal">All policies</Link>
        <Link to="/your-data">Your data</Link>
      </nav>
      <p className="footer-meta small muted">
        © {year} {ENTITY} ·{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <br />
        Not medical advice. Train within your limits — see the Health disclaimer.
      </p>
    </footer>
  );
}
