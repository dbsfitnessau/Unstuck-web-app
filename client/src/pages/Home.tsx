import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cheatsheet, STOP_SIGNS, CONTRAINDICATIONS } from "../data/dummyContent";
import { daysDone, nextDue, TOTAL_DAYS } from "../data/schedule";
import Accordion from "../components/Accordion";

// The Home screen, "Soft Studio" edition:
//   1. An olive hero with a progress ring showing where you are in the 28 days.
//      The ring reads REAL progress from the worksheet log (see data/schedule.ts),
//      so ticking off a session moves the ring.
//   2. "Your toolkit" - a tile per tab, doubling as navigation + how-to.
//   3. "The details" - principles / vocabulary / FAQ / stop signs in animated
//      accordions, collapsed by default so the page opens calm.

const RING_R = 36;                       // ring radius in the 86x86 SVG
const RING_C = 2 * Math.PI * RING_R;     // its circumference, for the dash trick

export default function Home() {
  // How many of the 28 days are done, per the worksheet's own rules.
  const done = daysDone();
  const today = Math.min(done + 1, TOTAL_DAYS);
  // Where the CTA should land you - read once (each call re-scans the log).
  const due = nextDue();

  // Ring draw-on-load: render it EMPTY first, then flip to the real value one
  // frame later - the CSS transition animates the sweep.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const offset = drawn ? RING_C * (1 - done / TOTAL_DAYS) : RING_C;

  return (
    <div>
      {/* ---- Hero ---- */}
      <div className="hero">
        <div className="blob b1" /><div className="blob b2" />
        <div className="hero-row">
          <div className="hero-text">
            <h2>{done > 0 ? "Welcome back" : "Welcome to UNSTUCK"}</h2>
          </div>
          <div className="ring">
            <svg width="86" height="86" viewBox="0 0 86 86" fill="none" aria-hidden="true">
              <circle className="track" cx="43" cy="43" r={RING_R} strokeWidth="7" />
              <circle
                className="fill"
                cx="43" cy="43" r={RING_R} strokeWidth="7"
                strokeDasharray={RING_C}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="label" aria-label={`Day ${today} of ${TOTAL_DAYS}`}>
              <span className="day-num">{today}</span>
              <small>OF {TOTAL_DAYS}</small>
            </div>
          </div>
        </div>
        <p>
          A 28-day mobility reset.<br />
          Five short sessions a week.<br />
          Scaled to where you actually are.
        </p>
        {/* The CTA deep-links into the worksheet: ?week opens the right week
            tab, ?day scrolls to that day's card (QuickCards reads both). */}
        <Link className="cta" to={`/worksheet?week=${due.week}&day=${due.day}`}>
          {done === 0 ? "Start Day 1" : `Continue Day ${today}`} →
        </Link>
      </div>

      {/* ---- Toolkit: each tile is a how-to AND a link to that tab ---- */}
      <h2 className="section-title">Your toolkit - How to use</h2>
      <div className="tiles">
        <Link to="/program" className="tile wide">
          <span className="ico" aria-hidden="true">🗓</span>
          <span>
            <h4>Program</h4>
            <p>Your daily sessions. Pick a week, pick a day, follow each movement. Start honest, not heroic.</p>
            <p style={{ marginTop: 6 }}>
              Every stretch has three options -<br className="legend-break" />{" "}
              <span className="tier-legend">🟢 Recreational, 🟡 Intermediate, 🔴 Athlete.</span>
            </p>
          </span>
        </Link>
        <Link to="/worksheet" className="tile alt">
          <span className="ico" aria-hidden="true">✅</span>
          <h4>Worksheet</h4>
          <p>Tick off progress. Log effort. Reflect weekly.</p>
        </Link>
        <Link to="/testing" className="tile">
          <span className="ico" aria-hidden="true">📐</span>
          <h4>Assessment</h4>
          <p>Measure Day 0. Re-test every 28 days.</p>
        </Link>
        {/* Coach isn't a route - it opens the coach sheet. App listens for this event. */}
        <button
          type="button"
          className="tile"
          onClick={() => window.dispatchEvent(new Event("unstuck:coach"))}
        >
          <span className="ico" aria-hidden="true">💬</span>
          <h4>Coach</h4>
          <p>Stuck on a cue or need a swap? Ask anytime.</p>
        </button>
        <Link to="/search" className="tile alt">
          <span className="ico" aria-hidden="true">🔍</span>
          <h4>Search</h4>
          <p>Any movement, term, or test in a second.</p>
        </Link>
      </div>

      {/* ---- Reference material, collapsed by default ---- */}
      <h2 className="section-title">The details</h2>

      <Accordion icon="🧠" title="The 5 Principles">
        {cheatsheet.principles.map((p, i) => (
          <div className="mini" key={i}>
            <h5>{i + 1}. {p.title}</h5>
            <p>{p.body}</p>
            <span className="pill">{p.practical}</span>
          </div>
        ))}
      </Accordion>

      <Accordion icon="📖" title="Vocabulary">
        {cheatsheet.vocabulary.map((v, i) => (
          <div className="mini" key={i}>
            <h5 style={{ marginBottom: v.sub ? 0 : undefined }}>{v.term}</h5>
            {v.sub && <p className="small muted" style={{ margin: "0 0 4px" }}>{v.sub}</p>}
            <p>{v.meaning}</p>
            <p className="muted" style={{ marginTop: 4 }}><strong>Why you care:</strong> {v.why}</p>
          </div>
        ))}
        {/* FRC method attribution lives in the legal pages (IP & Copyright + disclaimer). */}
      </Accordion>

      <Accordion icon="❓" title="FAQ">
        {cheatsheet.faq.map((f, i) => (
          <div className="mini" key={i}>
            <h5><span className="faq-q">Q.</span> {f.q}</h5>
            <p style={{ whiteSpace: "pre-line" }}>{f.a}</p>
          </div>
        ))}
      </Accordion>

      <Accordion icon="🛑" title="Stop signs" tone="stop">
        <div className="mini stop">
          <h5>Stop the session if:</h5>
          <ul>
            {STOP_SIGNS.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div className="mini stop">
          <h5>Not for everyone</h5>
          <p>{CONTRAINDICATIONS}</p>
        </div>
      </Accordion>
    </div>
  );
}
