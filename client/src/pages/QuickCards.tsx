import { useState } from "react";
import { STOP_SIGNS, CONTRAINDICATIONS, TIERS, type Tier } from "../data/dummyContent";
import { phaseForWeek, type Exercise } from "../data/program";
import { useLocalStorage } from "../state/useLocalStorage";
import Timer from "../components/Timer";

// ---------------------------------------------------------------------------
// The "Worksheet" tab = the 28-day log from the printed worksheet, made
// interactive. It's split into FOUR sub-tabs, one per week, so you only ever
// see the week you're in.
//
// For each TRAINING day you:
//   - pick the colour (tier) you're running that day - once picked, every
//     stretch shows just that colour's cue (the other two hide);
//   - tick off each stretch as you finish it (tick again to undo and redo);
//   - rate effort /10, (weeks 3-4) log load in kg, and jot a note.
// A day counts as "done" once every stretch in it is ticked.
// Each week also has the three reflection prompts from the worksheet.
//
// Everything is saved to the browser's localStorage (via useLocalStorage) so it
// survives a refresh or closing the tab - no account or server needed for M1.
// ---------------------------------------------------------------------------

// The fixed schedule. `train: false` marks recovery/rest days (no stretches).
// Weeks 3-4 set `loaded: true`, which reveals the extra "Load (kg)" field.
interface DayRow { day: number; session: string; train: boolean; }
interface WeekDef { week: number; phase: string; note: string; loaded: boolean; days: DayRow[]; }

const WEEKS: WeekDef[] = [
  {
    week: 1, phase: "Foundation", loaded: false,
    note: "Ease in. Pick a tier you can run with clean form for all five sessions.",
    days: [
      { day: 1, session: "Hips & Hamstrings", train: true },
      { day: 2, session: "T-Spine & Shoulders", train: true },
      { day: 3, session: "Full-Body Flow & Breath", train: true },
      { day: 4, session: "Ankles & Deep Squat", train: true },
      { day: 5, session: "Posterior Chain & Wind-Down", train: true },
      { day: 6, session: "Active Recovery - walk / cycle / swim", train: false },
      { day: 7, session: "Rest", train: false },
    ],
  },
  {
    week: 2, phase: "Foundation", loaded: false,
    note: "Progress holds (+15s) and active sets (+1–2 reps). Same tier or step up - your call.",
    days: [
      { day: 1, session: "Hips & Hamstrings (progress)", train: true },
      { day: 2, session: "T-Spine & Shoulders (progress)", train: true },
      { day: 3, session: "Full-Body Flow & Breath", train: true },
      { day: 4, session: "Ankles & Deep Squat (progress)", train: true },
      { day: 5, session: "Posterior Chain & Wind-Down (progress)", train: true },
      { day: 6, session: "Active Recovery - walk / cycle / swim", train: false },
      { day: 7, session: "Rest", train: false },
    ],
  },
  {
    week: 3, phase: "Progression", loaded: true,
    note: "Sessions are now 25–30 min. Warm up 2–3 min first. Load starts here.",
    days: [
      { day: 1, session: "Hips & Hamstrings, Loaded", train: true },
      { day: 2, session: "T-Spine & Shoulders, Loaded", train: true },
      { day: 3, session: "Full-Body Flow, Athletic", train: true },
      { day: 4, session: "Ankles & Deep Squat, Loaded", train: true },
      { day: 5, session: "Posterior Chain, Loaded", train: true },
      { day: 6, session: "Active Recovery - walk / cycle / swim", train: false },
      { day: 7, session: "Rest", train: false },
    ],
  },
  {
    week: 4, phase: "Progression", loaded: true,
    note: "Final push. Hold form over load - a clean rep beats a heavy ugly one.",
    days: [
      { day: 1, session: "Hips & Hamstrings, Loaded", train: true },
      { day: 2, session: "T-Spine & Shoulders, Loaded", train: true },
      { day: 3, session: "Full-Body Flow, Athletic", train: true },
      { day: 4, session: "Ankles & Deep Squat, Loaded", train: true },
      { day: 5, session: "Posterior Chain, Loaded", train: true },
      { day: 6, session: "Active Recovery - walk / cycle / swim", train: false },
      { day: 7, session: "Rest", train: false },
    ],
  },
];

// One day's log. `stretchDone` is keyed by the stretch's index in the session.
// Empty strings / empty object = "not filled in yet".
interface Entry { tier: Tier | ""; effort: string; load: string; note: string; stretchDone: Record<number, boolean>; }
interface Reflection { hardest: string; surprising: string; differently: string; }
const EMPTY_ENTRY: Entry = { tier: "", effort: "", load: "", note: "", stretchDone: {} };
const EMPTY_REFLECTION: Reflection = { hardest: "", surprising: "", differently: "" };

interface LogState {
  entries: Record<string, Entry>;          // keyed `w{week}d{day}`
  reflections: Record<number, Reflection>; // keyed by week number
}

// Stretches in a given week+day (week 1-2 -> Foundation, 3-4 -> Progression).
function stretchesFor(week: number, day: number): Exercise[] {
  return phaseForWeek(week).days.find((d) => d.day === day)?.exercises ?? [];
}

const totalTrainingDays = WEEKS.reduce(
  (n, w) => n + w.days.filter((d) => d.train).length,
  0,
); // = 20

export default function QuickCards() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [log, setLog] = useLocalStorage<LogState>("unstuck:worksheet-log", {
    entries: {},
    reflections: {},
  });

  const entry = (week: number, day: number): Entry =>
    log.entries[`w${week}d${day}`] ?? EMPTY_ENTRY;

  // Immutably update one day's entry. We spread the old state so React sees a
  // brand-new object and re-renders (mutating in place wouldn't trigger that).
  const setEntry = (week: number, day: number, patch: Partial<Entry>) =>
    setLog((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [`w${week}d${day}`]: { ...EMPTY_ENTRY, ...prev.entries[`w${week}d${day}`], ...patch },
      },
    }));

  // Tick / untick a single stretch within a day. We read from `prev` inside the
  // updater (not the outer closure) so rapid ticks accumulate correctly instead
  // of overwriting each other under React's state batching.
  const toggleStretch = (week: number, day: number, idx: number) =>
    setLog((prev) => {
      const key = `w${week}d${day}`;
      const cur = prev.entries[key] ?? EMPTY_ENTRY;
      return {
        ...prev,
        entries: {
          ...prev.entries,
          [key]: { ...EMPTY_ENTRY, ...cur, stretchDone: { ...cur.stretchDone, [idx]: !cur.stretchDone[idx] } },
        },
      };
    });

  // Clear every tick for a day so the program can be re-run.
  const resetDay = (week: number, day: number) =>
    setEntry(week, day, { stretchDone: {} });

  const reflection = (week: number): Reflection =>
    log.reflections[week] ?? EMPTY_REFLECTION;

  const setReflection = (week: number, patch: Partial<Reflection>) =>
    setLog((prev) => ({
      ...prev,
      reflections: {
        ...prev.reflections,
        [week]: { ...EMPTY_REFLECTION, ...prev.reflections[week], ...patch },
      },
    }));

  // A day is complete when every stretch in its session is ticked.
  const dayComplete = (week: number, day: number): boolean => {
    const list = stretchesFor(week, day);
    if (list.length === 0) return false;
    const e = entry(week, day);
    return list.every((_, i) => e.stretchDone[i]);
  };

  const doneCount = WEEKS.reduce(
    (n, w) => n + w.days.filter((d) => d.train && dayComplete(w.week, d.day)).length,
    0,
  );

  const w = WEEKS.find((x) => x.week === activeWeek)!;

  return (
    <div>
      <h2 className="section-title">Worksheet</h2>

      {/* Safety first, always visible and never buried. */}
      <div className="stop-box">
        <h3>🛑 Stop signs</h3>
        <ul>
          {STOP_SIGNS.map((s, i) => <li key={i} className="small">{s}</li>)}
        </ul>
        <p className="small" style={{ marginTop: 10 }}><strong>Not for:</strong> {CONTRAINDICATIONS}</p>
      </div>

      {/* Headline progress across the whole 28 days. */}
      <div className="card" style={{ textAlign: "center" }}>
        <h3 style={{ margin: 0, fontSize: 28 }}>{doneCount} / {totalTrainingDays}</h3>
        <p className="small muted" style={{ margin: "4px 0 0" }}>days completed (all stretches ticked)</p>
      </div>

      {/* Week sub-tabs - one week per tab. */}
      <div className="seg-tabs" role="tablist" aria-label="Week">
        {WEEKS.map((x) => (
          <button
            key={x.week}
            role="tab"
            aria-selected={x.week === activeWeek}
            className={`seg-tab ${x.week === activeWeek ? "active" : ""}`}
            onClick={() => setActiveWeek(x.week)}
          >
            Week {x.week}
          </button>
        ))}
      </div>

      <p className="small muted" style={{ margin: "0 0 12px" }}>
        <strong>{w.phase}.</strong> {w.note}
      </p>

      {w.days.map((d) => {
        const e = entry(w.week, d.day);
        const complete = dayComplete(w.week, d.day);
        return (
          <div className={`card ${complete ? "day-complete" : ""}`} key={d.day} style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <strong className="small">Day {d.day}</strong>
                <div className="small muted">{d.session}</div>
              </div>
              {d.train && complete && <span className="done-badge">✓ Done</span>}
            </div>

            {/* Recovery/rest days only need the line above. Training days get the
                colour picker, the per-stretch checklist, and the day log. */}
            {d.train && (
              <>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span className="small muted">Today's colour:</span>
                  <div className="tier-toggle">
                    {TIERS.map((t) => (
                      <button
                        key={t.id}
                        className={e.tier === t.id ? "active" : ""}
                        onClick={() => setEntry(w.week, d.day, { tier: e.tier === t.id ? "" : t.id })}
                        title={t.label}
                      >
                        {t.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <StretchChecklist
                  exercises={stretchesFor(w.week, d.day)}
                  tier={e.tier}
                  stretchDone={e.stretchDone}
                  onToggle={(i) => toggleStretch(w.week, d.day, i)}
                />

                {/* Per-day session timer - collapsed by default so it's there when
                    you need it (holds, PAILs/RAILs) without cluttering the day. */}
                <details className="timer-card">
                  <summary>⏱ Timer <span className="small muted">- holds &amp; PAILs/RAILs</span></summary>
                  <Timer />
                </details>

                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <label className="small muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Effort
                    <input
                      type="number" min={1} max={10} placeholder="/10"
                      style={{ width: 64 }}
                      value={e.effort}
                      onChange={(ev) => setEntry(w.week, d.day, { effort: ev.target.value })}
                    />
                  </label>
                  {w.loaded && (
                    <label className="small muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Load
                      <input
                        type="number" min={0} placeholder="kg"
                        style={{ width: 64 }}
                        value={e.load}
                        onChange={(ev) => setEntry(w.week, d.day, { load: ev.target.value })}
                      />
                    </label>
                  )}
                  <input
                    type="text" placeholder="Quick note"
                    style={{ flex: 1, minWidth: 140 }}
                    value={e.note}
                    onChange={(ev) => setEntry(w.week, d.day, { note: ev.target.value })}
                  />
                  <button className="reset-link" onClick={() => resetDay(w.week, d.day)}>
                    Reset ticks
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* End-of-week reflection prompts (straight from the worksheet). */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Week {w.week} reflection</h3>
        <ReflectionField
          label="Hardest position"
          value={reflection(w.week).hardest}
          onChange={(v) => setReflection(w.week, { hardest: v })}
        />
        <ReflectionField
          label="Most surprising change"
          value={reflection(w.week).surprising}
          onChange={(v) => setReflection(w.week, { surprising: v })}
        />
        <ReflectionField
          label="One thing to do differently"
          value={reflection(w.week).differently}
          onChange={(v) => setReflection(w.week, { differently: v })}
        />
      </div>
    </div>
  );
}

// The interactive per-stretch checklist for one training day. Each row has a
// photo slot, a tick button, the name + sets/reps, and the cue. Before a colour
// is picked we show all three tiers; once a colour is picked we show only that
// one (the other two hide), per the day's selected tier.
function StretchChecklist({
  exercises, tier, stretchDone, onToggle,
}: {
  exercises: Exercise[];
  tier: Tier | "";
  stretchDone: Record<number, boolean>;
  onToggle: (idx: number) => void;
}) {
  if (exercises.length === 0) return null;
  const selected = TIERS.find((t) => t.id === tier);
  return (
    <div className="stretch-list">
      {exercises.map((ex, i) => {
        const done = !!stretchDone[i];
        return (
          <div className={`stretch-row ${done ? "ticked" : ""}`} key={i}>
            <button
              className={`checkbtn ${done ? "on" : ""}`}
              onClick={() => onToggle(i)}
              aria-pressed={done}
              aria-label={`Tick ${ex.name}`}
            >
              {done ? "✓" : "○"}
            </button>

            {/* Photo slot - placeholder until a real image URL is added to the
                exercise's `image` field, then it shows here. */}
            {ex.image ? (
              <img className="stretch-photo" src={ex.image} alt={ex.name} />
            ) : (
              <div className="stretch-photo stretch-photo--placeholder" aria-hidden="true">📷</div>
            )}

            <div className="stretch-body">
              <div className="stretch-head">
                <strong className="small">{ex.name}</strong>
                <span className="small muted">{ex.setsReps}</span>
              </div>
              {selected ? (
                <div className="small">
                  <span className={`tier-${selected.id}`}>{selected.emoji} {ex.tier[selected.id]}</span>
                </div>
              ) : (
                <div className="stretch-code small">
                  <span>🟢 {ex.tier.green}</span>
                  <span>🟡 {ex.tier.amber}</span>
                  <span>🔴 {ex.tier.red}</span>
                </div>
              )}
              <div className="small muted">{ex.notes}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReflectionField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void; }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span className="small muted" style={{ display: "block", marginBottom: 4 }}>{label}</span>
      <input
        type="text"
        style={{ width: "100%" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
