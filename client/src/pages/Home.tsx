import { cheatsheet } from "../data/dummyContent";

// The Home screen: a welcome + how-to-use intro, then the reference material
// (principles, vocabulary, FAQ) tucked into collapsible dropdowns so the page
// opens calm and you expand only what you want.
//
// The dropdowns use the native HTML <details>/<summary> element - the browser
// handles open/close, keyboard, and screen-reader behaviour for free, so we
// don't need any React state for it. We just style it to match the brand.

// A quick map of the app's tabs, shown in "How to use".
const TABS = [
  { icon: "🗓", name: "Program", blurb: "Your daily sessions. Pick a week, pick a day, follow each movement. Every stretch has three options - 🟢 Recreational, 🟡 Intermediate, 🔴 Athlete. Start honest, not heroic." },
  { icon: "✅", name: "Worksheet", blurb: "Tick off each stretch as you go, log effort and load, reflect each week. It remembers where you are - come back and pick up." },
  { icon: "📐", name: "Assessment", blurb: "Measure yourself on Day 0, then re-test every 28 days. Numbers keep you honest when it doesn't feel like progress." },
  { icon: "🔍", name: "Search", blurb: "Find any movement, term, or test in a second." },
  { icon: "💬", name: "Coach", blurb: "Stuck on a cue or need a swap? Ask." },
];

export default function Home() {
  return (
    <div>
      <h2 className="section-title">Home</h2>

      {/* Welcome - always visible, sets the tone. */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Welcome to UNSTUCK</h3>
        <p className="small" style={{ marginBottom: 0 }}>
          A 28-day mobility reset. No fluff, no 400 exercises you'll never do - five
          short sessions a week, scaled to where you actually are. Two weeks to build
          the foundation, two weeks to load it.
        </p>
      </div>

      {/* How to use - a quick tour of the tabs. */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>How to use the app</h3>
        <ul className="howto">
          {TABS.map((t) => (
            <li key={t.name}>
              <span className="howto-icon" aria-hidden="true">{t.icon}</span>
              <span><strong>{t.name}</strong> - {t.blurb}</span>
            </li>
          ))}
        </ul>
        <p className="small muted" style={{ marginBottom: 0 }}>
          When in doubt, drop to 🟢, smaller range, no load. Pain that's sharp, or
          tingling - stop, and see a physio. The detail below is the why behind all of it.
        </p>
      </div>

      {/* Reference material - collapsed by default, expand what you want. */}
      <details className="dropdown">
        <summary>The 5 Principles</summary>
        <div className="dropdown-body">
          {cheatsheet.principles.map((p, i) => (
            <div className="card" key={i}>
              <h3>{i + 1}. {p.title}</h3>
              <p className="small">{p.body}</p>
              <p className="small"><strong>Practical:</strong> {p.practical}</p>
            </div>
          ))}
        </div>
      </details>

      <details className="dropdown">
        <summary>Vocabulary</summary>
        <div className="dropdown-body">
          <table className="grid">
            <thead><tr><th>Term</th><th>What it means</th><th>Why you care</th></tr></thead>
            <tbody>
              {cheatsheet.vocabulary.map((v, i) => (
                <tr key={i}><td><strong>{v.term}</strong></td><td>{v.meaning}</td><td className="muted">{v.why}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="dropdown">
        <summary>FAQ</summary>
        <div className="dropdown-body">
          {/* Each question is its own nested dropdown - a true FAQ accordion. */}
          {cheatsheet.faq.map((f, i) => (
            <details className="dropdown dropdown--nested" key={i}>
              <summary>{f.q}</summary>
              <div className="dropdown-body">
                <p className="small muted" style={{ margin: 0 }}>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </details>
    </div>
  );
}
