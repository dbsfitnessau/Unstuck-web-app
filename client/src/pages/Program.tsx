import { useState } from "react";
import { phases, phaseForWeek } from "../data/program";
import { TIERS } from "../data/dummyContent";

// The Program tab is a drill-down with three steps:
//   1. Pick a WEEK (1-4)
//   2. Pick a DAY (1-5) within that week's phase
//   3. See the full SESSION (every exercise, full detail, tier-aware)
// We track where the user is with two pieces of state (week + day). "null"
// means "not chosen yet", which decides which step we render.
export default function Program() {
  const [week, setWeek] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);

  // ---- STEP 1: choose a week ----
  if (week === null) {
    // Flatten the two phases into a single Week 1 -> 4 list so the options stack
    // vertically and fill the page (instead of a 2x2 grid grouped by phase).
    const weekList = phases.flatMap((phase) => phase.weeks.map((w) => ({ w, phase })));
    return (
      <div>
        <h2 className="section-title">Choose your week</h2>
        <div className="week-stack">
          {weekList.map(({ w, phase }) => (
            <button key={w} className="pick-btn week-pick" onClick={() => setWeek(w)}>
              <strong>Week {w}</strong>
              <span className="muted small">
                {phase.label} · {phase.duration} · effort {phase.effort.split("-")[0].trim()}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const phase = phaseForWeek(week);

  // ---- STEP 2: choose a day ----
  if (day === null) {
    return (
      <div>
        <button className="back-link" onClick={() => setWeek(null)}>← Weeks</button>
        <h2 className="section-title">Week {week} · {phase.label} - choose a day</h2>
        <div className="stop-box" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="small"><strong>Before you start:</strong> {phase.warmup}</p>
        </div>
        {phase.days.map((d) => (
          <button key={d.day} className="pick-btn wide" onClick={() => setDay(d.day)}>
            <strong>Day {d.day} - {d.focus}</strong>
            <span className="muted small">{d.exercises.length} movements</span>
          </button>
        ))}
      </div>
    );
  }

  // ---- STEP 3: the full session ----
  const session = phase.days.find((d) => d.day === day)!;

  return (
    <div>
      <button className="back-link" onClick={() => setDay(null)}>← Week {week} days</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 12px" }}>
        <div>
          <h3 style={{ margin: 0 }}>Day {day} - {session.focus}</h3>
          <span className="small muted">Week {week} · {phase.label} · {phase.duration}</span>
        </div>
      </div>

      {session.exercises.map((ex, i) => {
        // A whole-exercise SKIP (e.g. Jefferson Curl on 🟢) gets the red safety
        // callout. We test the GREEN tier specifically and case-SENSITIVELY: only
        // a true "SKIP - substitute…" trips it, not casual notes like
        // "Skip overhead reach".
        const isSkip = ex.tier.green.startsWith("SKIP");
        return (
          <div className={`card ${isSkip ? "warn-card" : ""}`} key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ margin: 0 }}>{i + 1}. {ex.name}</h3>
              <span className="small muted" style={{ whiteSpace: "nowrap" }}>{ex.setsReps}</span>
            </div>

            {/* Image slot - a placeholder for now; drop a real illustration URL
                into the exercise's `image` field later and it renders here. */}
            {ex.image ? (
              <img className="ex-image" src={ex.image} alt={ex.name} />
            ) : (
              <div className="ex-image ex-image--placeholder">Illustration coming soon</div>
            )}

            <p className="ex-field"><span className="ex-label">How</span> {ex.how}</p>
            <p className="ex-field"><span className="ex-label">Key focus</span> {ex.keyFocus}</p>
            <p className="ex-field"><span className="ex-label">Why</span> {ex.why}</p>

            {/* All three tier options, always shown, with the user's selected
                tier highlighted so they see where they sit relative to the rest. */}
            <div className="tier-options">
              {TIERS.map((t) => (
                <div key={t.id} className="tier-option">
                  <span className="tier-option__head">{t.emoji} {t.label}</span>
                  <span className="tier-option__body">{ex.tier[t.id]}</span>
                </div>
              ))}
            </div>

            {ex.contraindications && (
              <p className="contra"><span className="ex-label">Contraindications</span> {ex.contraindications}</p>
            )}

            <p className="small muted" style={{ margin: "8px 0 0" }}>{ex.notes}</p>
          </div>
        );
      })}
    </div>
  );
}
