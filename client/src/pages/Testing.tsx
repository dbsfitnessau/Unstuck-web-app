import { useEffect, useRef, useState } from "react";
import { tests, type MobilityTest, type TestField } from "../data/dummyContent";
import { useSyncedStorage } from "../state/useSyncedStorage";
import { uploadTestPhoto, getTestPhotoUrl, deleteTestPhoto } from "../state/photos";

// ---------------------------------------------------------------------------
// The Assessment area = the 7 field tests, re-tested on a rolling 28-day
// cadence (Day 0, 28, 56, 84, …). You pick a round at the top, fill that
// round's tests, and add the next round (+28 days) when you reach it. The
// scorecard compares every round against your Day 0 baseline.
//
// Each test is data-driven (see data/dummyContent.ts): a list of FIELDS, each
// a tick / number / choice, optionally tagged left or right. Left/right fields
// render in a two-column block (left on the left, right on the right) so a
// per-side assessment reads differently from a full-body test, with the
// average shown underneath. Each test also takes any number of user-uploaded
// result photos, stored in Supabase Storage (see state/photos.ts).
//
// Storage shapes (localStorage, mirrored to the cloud via useSyncedStorage):
//   - milestones: the round day-numbers, e.g. [0, 28, 56, 84].
//   - results: results[testId][day] = { values, photoPaths }, where `values` is
//     keyed by field key (boolean for ticks, string for numbers/choices) and
//     `photoPaths` is the list of Storage paths of the uploaded photos. (Older
//     saved data used a single `photoPath` string; we coerce it, see pathsOf.)
// ---------------------------------------------------------------------------

interface Entry {
  values: Record<string, string | boolean>;
  photoPaths?: string[];
}
type Results = Record<string, Record<string, Entry>>; // testId -> dayNumber -> Entry

// A (possibly legacy) raw entry, plus the old single-photo field for migration.
type RawEntry = Partial<Entry> & { photoPath?: string };

// Read an entry's photo paths, coercing legacy single-photo data to an array.
function pathsOf(raw: RawEntry | undefined): string[] {
  if (raw?.photoPaths) return raw.photoPaths;
  return raw?.photoPath ? [raw.photoPath] : [];
}

const DEFAULT_MILESTONES = [0, 28, 56, 84]; // Day 0 baseline + three 28-day retests; "+ Round" adds more, no cap
// One-time reset: clears any rounds added before, snapping saved rounds back to
// the 0..84 baseline once. Bump the key if you ever need to force it again.
const ROUNDS_RESET_FLAG = "unstuck:test-rounds-84-reset";
const roundLabel = (day: number) => `Day ${day}`;

// Average of two numeric field values; "" if either is missing/non-numeric.
function avg(a: unknown, b: unknown): string {
  const x = parseFloat(String(a));
  const y = parseFloat(String(b));
  if (isNaN(x) || isNaN(y)) return "";
  return String(Math.round(((x + y) / 2) * 10) / 10);
}

// The scorecard value for a test from one round's entry (numeric string or "").
function scoreValue(t: MobilityTest, e: Entry | undefined): string {
  const vals = e?.values ?? {};
  if (!t.score) return "";
  if (t.score.averageOf) return avg(vals[t.score.averageOf[0]], vals[t.score.averageOf[1]]);
  if (t.score.field) {
    const v = vals[t.score.field];
    return v == null ? "" : String(v);
  }
  return "";
}

export default function Testing() {
  const [milestones, setMilestones] = useSyncedStorage<number[]>("unstuck:test-milestones", DEFAULT_MILESTONES);
  const [results, setResults] = useSyncedStorage<Results>("unstuck:test-results", {});
  const [activeDay, setActiveDay] = useState<number>(0);

  // One-time "refresh to the 0..84 baseline": reset saved rounds to the default
  // once (clears any rounds added before this), then "+ Round" adds more freely.
  // Test RESULTS are untouched - only the list of round day-numbers is reset.
  useEffect(() => {
    try {
      if (localStorage.getItem(ROUNDS_RESET_FLAG)) return;
      localStorage.setItem(ROUNDS_RESET_FLAG, "1");
      setMilestones(DEFAULT_MILESTONES);
      setActiveDay(0);
    } catch {
      /* localStorage unavailable - skip the reset */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read one test's entry for the active round. Defensive: older saved data
  // used a different shape ({ checks, metric }); we coerce to the new shape so
  // a legacy entry shows blank fields rather than crashing the page.
  function entry(testId: string): Entry {
    const raw = results[testId]?.[String(activeDay)] as RawEntry | undefined;
    return { values: raw?.values ?? {}, photoPaths: pathsOf(raw) };
  }

  // Both writers below patch the active round's entry for one test, leaving
  // every other test/round untouched. This shared helper does the drill-in and
  // write-back so the two only have to say *how* to change the current entry.
  function updateEntry(testId: string, change: (cur: RawEntry) => Entry) {
    setResults((prev) => {
      const forTest = prev[testId] ?? {};
      const cur = (forTest[String(activeDay)] as RawEntry | undefined) ?? {};
      return { ...prev, [testId]: { ...forTest, [String(activeDay)]: change(cur) } };
    });
  }

  function setField(testId: string, key: string, value: string | boolean) {
    updateEntry(testId, (cur) => ({ values: { ...(cur.values ?? {}), [key]: value }, photoPaths: pathsOf(cur) }));
  }

  function addPhoto(testId: string, path: string) {
    updateEntry(testId, (cur) => ({ values: cur.values ?? {}, photoPaths: [...pathsOf(cur), path] }));
  }

  function removePhoto(testId: string, path: string) {
    updateEntry(testId, (cur) => ({ values: cur.values ?? {}, photoPaths: pathsOf(cur).filter((p) => p !== path) }));
  }

  // Add the next 28-day round (e.g. 84 -> 112) and jump to it. No upper limit.
  function addRound() {
    const next = (milestones[milestones.length - 1] ?? 0) + 28;
    setMilestones((prev) => [...prev, next]);
    setActiveDay(next);
  }

  return (
    <div>
      {/* Intro note: informational, not a safety warning - olive treatment. */}
      <div className="warmup-box" style={{ marginBottom: 16 }}>
        <span className="ico" aria-hidden="true">📐</span>
        <div>
          <h3>Progress Assessment</h3>
          <p className="small">
            Measure on Day 0 (Baseline). Re-test every 28 days.<br />
            Treat changes under ~1cm or ~5° as noise.<br />
            <strong>Tools required:</strong> tape measure, a stable bench or bed, an unobstructed wall.
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

      {tests.map((t) => (
        <TestCard
          key={t.id}
          test={t}
          day={activeDay}
          entry={entry(t.id)}
          onField={(k, v) => setField(t.id, k, v)}
          onAddPhoto={(p) => addPhoto(t.id, p)}
          onRemovePhoto={(p) => removePhoto(t.id, p)}
        />
      ))}

      <Scorecard results={results} milestones={milestones} />
    </div>
  );
}

// One test card: demo photo, setup, the fields (full-width + an L/R block),
// the computed average (if any), and the user's photo upload.
function TestCard({
  test,
  day,
  entry,
  onField,
  onAddPhoto,
  onRemovePhoto,
}: {
  test: MobilityTest;
  day: number;
  entry: Entry;
  onField: (key: string, value: string | boolean) => void;
  onAddPhoto: (path: string) => void;
  onRemovePhoto: (path: string) => void;
}) {
  const sideFields = test.fields.filter((f) => f.side);

  // Build the render sequence: full-width fields stay in place; the whole run
  // of side fields collapses into ONE two-column block at its first position.
  const blocks: Array<"sideblock" | TestField> = [];
  let sideInserted = false;
  for (const f of test.fields) {
    if (f.side) {
      if (!sideInserted) {
        blocks.push("sideblock");
        sideInserted = true;
      }
    } else {
      blocks.push(f);
    }
  }

  return (
    <div className="card">
      <h3>{test.name}</h3>
      {test.image && (
        <img className="ex-image assessment-photo" src={test.image} alt={`${test.name} demonstration`} loading="lazy" />
      )}
      <p className="small muted">{test.setup}</p>

      <div className="test-fields">
        {blocks.map((b, i) =>
          b === "sideblock" ? (
            <div className="lr-grid" key={`side-${i}`}>
              {(["left", "right"] as const).map((side, ci) => (
                <div className="lr-col" key={side}>
                  <div className="lr-head small">
                    {test.sideHeadings ? test.sideHeadings[ci] : side === "left" ? "Left" : "Right"}
                  </div>
                  {sideFields
                    .filter((f) => f.side === side)
                    .map((f) => (
                      <FieldInput
                        key={f.key}
                        field={f}
                        value={entry.values[f.key]}
                        onChange={(v) => onField(f.key, v)}
                      />
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <FieldInput
              key={b.key}
              field={b}
              value={entry.values[b.key]}
              onChange={(v) => onField(b.key, v)}
            />
          ),
        )}

        {/* Computed average for left/right numeric tests (feeds the scorecard). */}
        {(() => {
          const s = test.score;
          if (!s?.averageOf) return null;
          const m = avg(entry.values[s.averageOf[0]], entry.values[s.averageOf[1]]);
          return (
            <div className="test-average">
              <span className="ex-label">{s.averageLabel ?? "Average"}</span>
              <strong>{m === "" ? "—" : `${m} ${s.unit}`}</strong>
            </div>
          );
        })()}
      </div>

      <PhotoUpload testId={test.id} day={day} paths={entry.photoPaths ?? []} onAdd={onAddPhoto} onRemove={onRemovePhoto} />
    </div>
  );
}

// A single field: a tick, a number input, or a single-select choice.
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TestField;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  if (field.type === "check") {
    const on = value === true;
    return (
      <button className={`checkbtn test-check ${on ? "on" : ""}`} aria-pressed={on} onClick={() => onChange(!on)}>
        <span aria-hidden="true">{on ? "✓" : "○"}</span> {field.label}
      </button>
    );
  }

  if (field.type === "choice") {
    return (
      <div className="test-choice">
        <span className="small muted test-field-label">{field.label}</span>
        <div className="choice-row">
          {(field.options ?? []).map((opt) => (
            <button
              key={opt}
              className={`choice-btn ${value === opt ? "on" : ""}`}
              aria-pressed={value === opt}
              onClick={() => onChange(value === opt ? "" : opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // number
  return (
    <label className="test-number">
      <span className="small muted test-field-label">
        {field.label}
        {field.unit ? ` (${field.unit})` : ""}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={typeof value === "string" ? value : ""}
        placeholder={field.unit ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// Upload / view the user's own result photos for this test + round. Several are
// allowed; the images live in Supabase Storage and we keep only their paths in
// the synced results.
function PhotoUpload({
  testId,
  day,
  paths,
  onAdd,
  onRemove,
}: {
  testId: string;
  day: number;
  paths: string[];
  onAdd: (path: string) => void;
  onRemove: (path: string) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({}); // path -> displayable URL
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch a signed URL for any stored path we don't already have one for.
  // (Freshly-uploaded paths already carry a local blob preview, so they're skipped.)
  useEffect(() => {
    let cancelled = false;
    const missing = paths.filter((p) => !urls[p]);
    if (missing.length === 0) return;
    Promise.all(missing.map((p) => getTestPhotoUrl(p).then((u) => [p, u] as const))).then((pairs) => {
      if (cancelled) return;
      setUrls((prev) => {
        const next = { ...prev };
        for (const [p, u] of pairs) if (u) next[p] = u;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths.join("|")]);

  // Upload every selected file, in order. Each gets an instant local preview.
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // let the user re-pick the same file later
    if (files.length === 0) return;
    setBusy(true);
    setErr("");
    for (const file of files) {
      try {
        const newPath = await uploadTestPhoto(testId, day, file);
        setUrls((prev) => ({ ...prev, [newPath]: URL.createObjectURL(file) }));
        onAdd(newPath);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "One or more uploads failed. Check your connection and try again.");
      }
    }
    setBusy(false);
  }

  async function remove(path: string) {
    try {
      await deleteTestPhoto(path);
    } catch {
      /* best-effort */
    }
    onRemove(path);
    setUrls((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }

  return (
    <div className="photo-upload">
      <span className="ex-label">Your photos</span>
      {paths.length > 0 && (
        <div className="photo-grid">
          {paths.map((p) => (
            <div className="photo-thumb" key={p}>
              {urls[p] ? (
                <img src={urls[p]} alt="Your test result" />
              ) : (
                <div className="photo-thumb__loading" aria-hidden="true">…</div>
              )}
              <button className="photo-thumb__remove" onClick={() => remove(p)} disabled={busy} aria-label="Remove photo">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button className="photo-add" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : paths.length ? "＋ Add more photos" : "＋ Upload photos of your result"}
      </button>
      {err && <p className="gate-error small">{err}</p>}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
    </div>
  );
}

// Scorecard: for each test, show every round's value and the change from the
// Day 0 baseline to the latest round that has a value. Rows follow the test
// order; L/R tests contribute their average.
function Scorecard({ results, milestones }: { results: Results; milestones: number[] }) {
  const rows = tests
    .filter((t) => t.score)
    .map((t) => {
      const byDay = results[t.id] ?? {};
      const valueAt = (day: number) => scoreValue(t, byDay[String(day)] as Entry | undefined);
      const values = milestones.map(valueAt);
      const baseline = valueAt(0);
      // Latest round (other than baseline) that actually has a value.
      let latest = "";
      for (let i = milestones.length - 1; i >= 0; i--) {
        if (milestones[i] === 0) continue;
        const v = valueAt(milestones[i]);
        if (v) {
          latest = v;
          break;
        }
      }
      const change =
        baseline && latest && !isNaN(+baseline) && !isNaN(+latest)
          ? (+latest - +baseline).toFixed(1)
          : "-";
      return { name: t.score!.label, unit: t.score!.unit, values, change };
    });

  return (
    <>
      <h2 className="section-title">Scorecard - change from Day 0</h2>
      <div className="card table-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Test</th>
              {milestones.map((day) => (
                <th key={day}>{roundLabel(day)}</th>
              ))}
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  {r.name} <span className="muted small">({r.unit})</span>
                </td>
                {r.values.map((v, j) => (
                  <td key={j}>{v || "-"}</td>
                ))}
                <td style={{ color: r.change !== "-" ? "var(--olive)" : "var(--text-dim)", fontWeight: 700 }}>
                  {r.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
