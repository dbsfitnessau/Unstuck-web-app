import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { STOP_SIGNS, CONTRAINDICATIONS, TIERS, type Tier } from "../data/dummyContent";
import { phaseForWeek, type Exercise } from "../data/program";
import { WEEKS } from "../data/schedule";
import { useSyncedStorage } from "../state/useSyncedStorage";
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

// The fixed schedule now lives in data/schedule.ts (imported above) because
// Home's progress ring needs it too — one source of truth for both screens.
// `train: false` marks recovery/rest days; weeks 3-4 set `loaded: true`,
// which reveals the extra "Load (kg)" field.

// One day's log. `stretchDone` is keyed by the stretch's index in the session.
// Empty strings / empty object = "not filled in yet".
// `warmedUp` is the weeks-3/4 warm-up tick. It's a logged item (like effort /
// load / note), NOT a completion gate — a day still counts as done on its
// stretches alone, so adding this never un-completes anyone's past sessions.
interface Entry { tier: Tier | ""; effort: string; load: string; note: string; stretchDone: Record<number, boolean>; rested: boolean; warmedUp: boolean; }
interface Reflection { hardest: string; surprising: string; differently: string; }
const EMPTY_ENTRY: Entry = { tier: "", effort: "", load: "", note: "", stretchDone: {}, rested: false, warmedUp: false };
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
  // Home's "Continue Day N" button arrives with ?week=2&day=3 in the address:
  // we open that week's tab and scroll its day card into view.
  const [searchParams] = useSearchParams();
  const [activeWeek, setActiveWeek] = useState(() => {
    const w = Number(searchParams.get("week"));
    return w >= 1 && w <= 4 ? w : 1;
  });
  useEffect(() => {
    const d = Number(searchParams.get("day"));
    if (!d) return;
    // Wait a beat for the cards to render, then scroll to the requested day.
    const t = setTimeout(() => {
      document.getElementById(`day-card-${d}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [log, setLog] = useSyncedStorage<LogState>("unstuck:worksheet-log", {
    entries: {},
    reflections: {},
  });

  // Always merge a saved entry over EMPTY_ENTRY so EVERY field is guaranteed to
  // exist — including `stretchDone`. This matters because data saved by older
  // versions of the app may be missing newer fields; without this, reading e.g.
  // `e.stretchDone[i]` on a legacy entry would throw and blank the whole page.
  const entry = (week: number, day: number): Entry => {
    const saved = log.entries[`w${week}d${day}`];
    return { ...EMPTY_ENTRY, ...saved, stretchDone: saved?.stretchDone ?? {} };
  };

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

  // Reset a day back to a blank slate so it can be re-run: ticks, effort,
  // load and quick note all clear. "Today's colour" (tier) is kept - it's a
  // preference, not part of the day's log.
  const resetDay = (week: number, day: number) =>
    setEntry(week, day, { stretchDone: {}, effort: "", load: "", note: "", warmedUp: false });

  const reflection = (week: number): Reflection =>
    ({ ...EMPTY_REFLECTION, ...log.reflections[week] });

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
        // "Done" for the badge/highlight: a training day fully ticked, or a
        // recovery/rest day (6 or 7) once it's ticked.
        const dayDone = d.train ? complete : (d.day === 6 || d.day === 7) ? e.rested : false;
        return (
          <div className={`card ${dayDone ? "day-complete" : ""}`} key={d.day} id={`day-card-${d.day}`} style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <strong className="small">Day {d.day}</strong>
                <div className="small muted">{d.session}</div>
              </div>
              {dayDone && <span className="done-badge">✓ Done</span>}
            </div>

            {/* Recovery/rest days only need the line above. Training days get the
                colour picker, the per-stretch checklist, and the day log. */}
            {d.train && (
              <>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span className="small muted">Today's colour:</span>
                  <div className="tier-toggle" role="group" aria-label="Today's colour (tier)">
                    {TIERS.map((t) => (
                      <button
                        key={t.id}
                        className={e.tier === t.id ? "active" : ""}
                        onClick={() => setEntry(w.week, d.day, { tier: e.tier === t.id ? "" : t.id })}
                        aria-pressed={e.tier === t.id}
                        aria-label={t.label}
                        title={t.label}
                      >
                        {t.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weeks 3-4 (loaded) sessions start with a warm-up. Shown as a
                    tickable row above the stretches so it can be marked off like
                    the rest of the session (but it doesn't gate "Done"). */}
                {w.loaded && (
                  <div className={`warmup-row ${e.warmedUp ? "done" : ""}`}>
                    <button
                      className={`checkbtn ${e.warmedUp ? "on" : ""}`}
                      aria-pressed={e.warmedUp}
                      aria-label="Mark warm-up done"
                      onClick={() => setEntry(w.week, d.day, { warmedUp: !e.warmedUp })}
                    >
                      {e.warmedUp ? "✓" : "○"}
                    </button>
                    <span className="warmup-label">
                      <strong>Warm-up</strong>
                      Warm up 2–3 min first (brisk walk, 30 jumping jacks, or skipping).
                    </span>
                  </div>
                )}

                <StretchChecklist
                  exercises={stretchesFor(w.week, d.day)}
                  tier={e.tier}
                  stretchDone={e.stretchDone}
                  onToggle={(i) => toggleStretch(w.week, d.day, i)}
                />

                {/* Per-day session timer - collapsed by default so it's there when
                    you need it (holds, PAILs/RAILs) without cluttering the day. */}
                <details className="timer-card">
                  <summary>⏱ Timer <span className="small muted">- Holds &amp; PAILs/RAILs</span></summary>
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
                    Reset Day
                  </button>
                </div>
              </>
            )}

            {/* Day 6 (active recovery): a tick to mark it done, plus a quick
                note (what you did - walk, swim, how it felt). Saved to the same
                entry's `note` field the training days use. */}
            {!d.train && d.day === 6 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                <button
                  className={`checkbtn ${e.rested ? "on" : ""}`}
                  aria-pressed={e.rested}
                  aria-label="Mark active recovery done"
                  onClick={() => setEntry(w.week, d.day, { rested: !e.rested })}
                >
                  {e.rested ? "✓" : "○"}
                </button>
                <span className="small muted">Mark active recovery done</span>
                <input
                  type="text" placeholder="Quick note"
                  style={{ flex: 1, minWidth: 140 }}
                  value={e.note}
                  onChange={(ev) => setEntry(w.week, d.day, { note: ev.target.value })}
                />
              </div>
            )}

            {/* Day 7 (rest): a simple tick to mark it done. */}
            {!d.train && d.day === 7 && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className={`checkbtn ${e.rested ? "on" : ""}`}
                  aria-pressed={e.rested}
                  aria-label="Mark rest day done"
                  onClick={() => setEntry(w.week, d.day, { rested: !e.rested })}
                >
                  {e.rested ? "✓" : "○"}
                </button>
                <span className="small muted">Mark rest day done</span>
              </div>
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
  // Which stretch's full-detail pop-up is open (null = none).
  const [detail, setDetail] = useState<Exercise | null>(null);
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

            {/* Tap the photo or text to open the full stretch details (straight
                from the program) in a pop-up. The tick button stays separate so
                ticking doesn't also open the pop-up. */}
            <button className="stretch-tap" onClick={() => setDetail(ex)} aria-label={`View ${ex.name} details`}>
              {ex.image ? (
                // Worksheet uses the lightweight 300px thumbnail set (public/thumbs)
                // for these small 88px squares; Program/Assessment use the full 800px set.
                <img className="stretch-photo" src={ex.image.replace("/exercises/", "/thumbs/")} alt={ex.name} loading="lazy" />
              ) : (
                <div className="stretch-photo stretch-photo--placeholder" aria-hidden="true">📷</div>
              )}

              <div className="stretch-body">
                <div className="stretch-head">
                  <strong className="small">{ex.name}</strong>
                  <span className="small muted">{ex.setsReps}</span>
                </div>
                {/* All three tier cues by default; once a day-colour is picked,
                    just that one (the other two hide). */}
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
                <span className="stretch-more">Tap for full details ›</span>
              </div>
            </button>
          </div>
        );
      })}

      {detail && <StretchDetailModal ex={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// Full stretch details (the same fields the Program page shows) in a pop-up,
// opened by tapping a worksheet row. Closes on the ✕, the backdrop, or Escape.
function StretchDetailModal({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${ex.name} details`}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close details">✕</button>
        <h3 style={{ margin: "0 34px 2px 0" }}>{ex.name}</h3>
        <div className="small muted" style={{ marginBottom: 4 }}>{ex.setsReps}</div>
        {ex.image && <img className="ex-image" src={ex.image} alt={ex.name} loading="lazy" />}
        <p className="ex-field"><span className="ex-label">How</span> {ex.how}</p>
        <p className="ex-field"><span className="ex-label">Key focus</span> {ex.keyFocus}</p>
        <p className="ex-field"><span className="ex-label">Why</span> {ex.why}</p>
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
        {ex.notes && <p className="small muted" style={{ margin: "8px 0 0" }}>{ex.notes}</p>}
      </div>
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
