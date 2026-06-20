import { Link, useParams } from "react-router-dom";
import {
  LEGAL_DOCS,
  getLegalDoc,
  type Block,
  ENTITY,
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
} from "../data/legal";

// Legal.tsx - two jobs in one file:
//   • /legal           → the index ("hub"): a tidy list of every policy.
//   • /legal/:slug      → one policy, rendered from the structured blocks in
//                         data/legal.ts. Edit the words there, not here.
//
// The renderer is deliberately "dumb": it walks the list of blocks and prints
// each one. linkify() turns our contact email into a clickable mailto link so
// the text in data/legal.ts can stay plain.

function linkify(text: string) {
  // Split the text around the contact email and make that part a link.
  const parts = text.split(CONTACT_EMAIL);
  if (parts.length === 1) return text;
  // Rebuild the text with a clickable email between each pair of parts.
  return parts.flatMap((part, i) =>
    i === parts.length - 1
      ? [part]
      : [
          part,
          <a key={i} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>,
        ],
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case "h":
      return <h3 className="legal-h">{block.text}</h3>;
    case "p":
      return <p className="legal-p">{linkify(block.text)}</p>;
    case "ul":
      return (
        <ul className="legal-ul">
          {block.items.map((item, i) => (
            <li key={i}>{linkify(item)}</li>
          ))}
        </ul>
      );
    case "note":
      return <div className="legal-note">{linkify(block.text)}</div>;
    default:
      return null;
  }
}

export default function Legal() {
  const { slug } = useParams();

  // ---- Single document view ----
  if (slug) {
    const doc = getLegalDoc(slug);
    if (!doc) {
      return (
        <div className="legal">
          <Link className="legal-back" to="/legal">
            ← All policies
          </Link>
          <h2 className="section-title">Policy not found</h2>
          <p className="muted">That policy doesn’t exist. Head back to the list.</p>
        </div>
      );
    }
    return (
      <div className="legal">
        <Link className="legal-back" to="/legal">
          ← All policies
        </Link>
        <h2 className="legal-title">
          <span aria-hidden="true">{doc.icon}</span> {doc.title}
        </h2>
        <p className="small muted legal-updated">Last updated: {EFFECTIVE_DATE}</p>
        {doc.blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
        <p className="small muted legal-foot">
          {ENTITY} · Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </div>
    );
  }

  // ---- Index / hub ----
  return (
    <div className="legal">
      <h2 className="section-title">Legal &amp; policies</h2>
      <p className="muted legal-intro">
        The fine print, in plain language. Tap any policy to read it.
      </p>
      <div className="legal-list">
        {LEGAL_DOCS.map((doc) => (
          <Link key={doc.slug} to={`/legal/${doc.slug}`} className="legal-card">
            <span className="legal-card-ico" aria-hidden="true">
              {doc.icon}
            </span>
            <span className="legal-card-text">
              <strong>{doc.title}</strong>
              <span className="small muted">{doc.short}</span>
            </span>
            <span className="legal-card-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
        <Link to="/your-data" className="legal-card">
          <span className="legal-card-ico" aria-hidden="true">
            🗂️
          </span>
          <span className="legal-card-text">
            <strong>Your data &amp; account</strong>
            <span className="small muted">
              See what we store, request a copy, or delete your account.
            </span>
          </span>
          <span className="legal-card-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
      <p className="small muted legal-foot">
        {ENTITY} · Last updated {EFFECTIVE_DATE} ·{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </div>
  );
}
