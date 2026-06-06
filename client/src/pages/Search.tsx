import { useState } from "react";
import { Link } from "react-router-dom";
import { searchIndex } from "../data/dummyContent";

// Cross-surface search. We filter the pre-built searchIndex (from dummyContent)
// by a case-insensitive match on title or text. Each result links to the screen
// it lives on. Simple substring matching is plenty for Milestone 1.
export default function Search() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const results = query
    ? searchIndex.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.text.toLowerCase().includes(query)
      )
    : [];

  return (
    <div>
      <h2 className="section-title">Search everything</h2>
      <input
        className="search-input"
        type="search"
        aria-label="Search the app"
        placeholder="Search moves, tests, principles…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />

      <div style={{ marginTop: 16 }}>
        {query && results.length === 0 && (
          <p className="muted small">No matches for “{q}”.</p>
        )}
        {results.map((r, i) => (
          <Link key={i} to={r.path} className="result-item">
            <span className="tag">{r.surface}</span>
            <div><strong>{r.title}</strong></div>
            <div className="muted small">{r.text.slice(0, 90)}…</div>
          </Link>
        ))}
        {!query && (
          <p className="muted small">Type to search across Home, the program, worksheet, and tests.</p>
        )}
      </div>
    </div>
  );
}
