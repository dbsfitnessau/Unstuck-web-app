import { useState } from "react";
import { tests } from "../data/dummyContent";
import { useLocalStorage } from "../state/useLocalStorage";

// ---------------------------------------------------------------------------
// The Testing area = the 7 field tests, re-tested on a rolling 28-day cadence.
// Instead of a fixed "Day 0 vs Day 28", testing now runs in ROUNDS: Day 0, 28,
// 56, 84, … - so someone repeating the program keeps logging progress over
// months. You pick a round at the top, fill that round's tests, and add the
// next round (+28 days) when you reach it. The scorecard compares every round
// against your Day 0 baseline.
//
// Storage shapes:
//   - milestones: the list of round day-numbers, e.g. [0, 28, 56, 84]. Persisted
//     so any extra rounds you add stick around.
//   - results: results[testId][dayNumber] = one Entry (pass/fail checks + metric).
// Both live in localStorage so they survive refreshes (no server needed for M1).
// ---------------------------------------------------------------------------

interface Entry { checks: boolean[]; metric: string; }
type Results = Record<string, Record<string, Entry>>; // testId -> dayNumber -> Entry

const DEFAULT_MILESTONES = [0, 28, 56, 84];

function blankEntry(checkCount: number): Entry {
  return { checks: Array(checkCount).fill(false), metric: "" };
}

const roundLabel = (day: number) => `Day ${day}`;

export default function Testing() {
  const [milestones, setMilestones] = useLocalStorage<number[]>("unstuck:test-milestones", DEFAULT_MILESTONES);
  const [results, setResults] = useLocalStorage<Results>("unstuck:test-results", {});
  const [activeDay, setActiveDay] = useState<number>(0);

  function entry(testId: string, day: number, checkCount: number): Entry {
    return results[testId]?.[String(day)] ?? blankEntry(checkCount);
  }

  function update(testId: string, day: number, checkCount: number, patch: Partial<Entry>) {
    setResults((prev) => {
      const forTest = prev[testId] ?? {};
      const current = forTest[String(day)] ?? blankEntry(checkCount);
      return { ...prev, [testId]: { ...forTest, [String(day)]: { ...current, ...patch } } };
    });
  }

  function toggleCheck(testId: string, day: number, checkCount: number, idx: number) {
    const cur = entry(testId, day, checkCount);
    const checks = [...cur.checks];
    checks[idx] = !checks[idx];
    update(testId, day, checkCount, { checks });
  }

  // Add the next 28-day round (e.g. 84 -> 112) and jump to it.
  function addRound() {
    const next = (milestones[milestones.length - 1] ?? 0) + 28;
    setMilestones((prev) => [...prev, next]);
    setActiveDay(next);
  }

  return (
    <div>
      {/* Intro note: informational, not a safety warning - so it gets the
          olive "before you start" treatment, not the red stop-box. */}
      <div className="warmup-box" style={{ marginBottom: 16 }}>
        <span className="ico" aria-hidden="true">📐</span>
        <div>
          <h3>Progress Assessment</h3>
          <p className="small">
            Measure on Day 0 (Baseline). Re-test every 28 days.<br />
            Treat changes under ~1cm or ~5° as noise.
          </p>
        </div>
      </div>

      {/* Round selector - one tab per milestone, plus "add round". */}
      <div className="seg-tabs" role="tablist" aria-label="Testing round">
        {milestones.map((day) => (
          <button
            key={day}
            role="tab"
            aria-selected={day === activeDay}
            className={`seg-tab ${day === activeDay ? "active" : ""}`}
            onClick={() => setActiveDay(day)}
          >
            {roundLabel(day)}
          </button>
        ))}
        <button className="seg-tab seg-tab--add" onClick={addRound} title="Add the next 28-day round">
          + Round
        </button>
      </div>

      <p className="small muted" style={{ margin: "0 0 12px" }}>
        Filling <strong>{roundLabel(activeDay)}</strong>
        {activeDay === 0 ? " - your baseline." : ` - compared against Day 0 in the scorecard below.`}
      </p>

      {tests.map((t) => {
        const n = t.checks.length;
        const e = entry(t.id, activeDay, n);
        return (
          <div className="card" key={t.id}>
            <h3>{t.name}</h3>

            {/* Illustration slot, same as the Program day pages: tests render
                the dashed placeholder until bespoke illustrations are ready.
                (Web-sized demo photos already exist in client/public/tests/ -
                to use one, set the test's `image` field, e.g.
                image: "/tests/deep-squat.jpg".) */}
            {t.image ? (
              <img className="ex-image" src={t.image} alt={`${t.name} demonstration`} loading="lazy" />
            ) : (
              <div className="ex-image ex-image--placeholder">Illustration coming soon</div>
            )}

            <p className="small muted">{t.setup}</p>

            <div style={{ marginTop: 12 }}>
              {t.checks.map((c, i) => (
                <button
                  key={i}
                  className={`checkbtn ${e.checks[i] ? "on" : ""}`}
                  style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, fontSize: 12 }}
                  onClick={() => toggleCheck(t.id, activeDay, n, i)}
                  aria-pressed={e.checks[i]}
                >
                  {e.checks[i] ? "✓" : "○"} {c}
                </button>
              ))}
              {t.metric && (
                <input
                  type="number"
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder={`${t.metric.label} (${t.metric.unit})`}
                  value={e.metric}
                  onChange={(ev) => update(t.id, activeDay, n, { metric: ev.target.value })}
                />
              )}
            </div>
          </div>
        );
      })}

      <Scorecard results={results} milestones={milestones} />
    </div>
  );
}

// Scorecard: for each test with a numeric metric, show every round's value and
// the change from the Day 0 baseline to the latest round that has a value.
function Scorecard({ results, milestones }: { results: Results; milestones: number[] }) {
  const rows = tests
    .filter((t) => t.metric)
    .map((t) => {
      const byDay = results[t.id] ?? {};
      const values = milestones.map((day) => byDay[String(day)]?.metric ?? "");
      const baseline = byDay["0"]?.metric;
      // Latest round (other than baseline) that actually has a value.
      let latest: string | undefined;
      for (let i = milestones.length - 1; i >= 0; i--) {
        if (milestones[i] === 0) continue;
        const v = byDay[String(milestones[i])]?.metric;
        if (v) { latest = v; break; }
      }
      const change =
        baseline && latest && !isNaN(+baseline) && !isNaN(+latest)
          ? (+latest - +baseline).toFixed(1)
          : "-";
      return { name: t.name, unit: t.metric!.unit, values, change };
    });

  return (
    <>
      <h2 className="section-title">Scorecard - change from Day 0</h2>
      <div className="card table-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Test</th>
              {milestones.map((day) => <th key={day}>{roundLabel(day)}</th>)}
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.name} <span className="muted small">({r.unit})</span></td>
                {r.values.map((v, j) => <td key={j}>{v || "-"}</td>)}
                <td style={{ color: r.change !== "-" ? "var(--olive)" : "var(--text-dim)", fontWeight: 700 }}>{r.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
