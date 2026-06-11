import { phaseForWeek } from "./program";

// ---------------------------------------------------------------------------
// The 28-day schedule, in ONE place.
// It used to live inside the Worksheet page, but now two screens need it:
//   - the Worksheet (to render the week-by-week log), and
//   - Home (to compute the progress ring: "Day N of 28").
// Sharing it from here means the two can never drift apart.
// ---------------------------------------------------------------------------

export interface DayRow { day: number; session: string; train: boolean; }
export interface WeekDef { week: number; phase: string; note: string; loaded: boolean; days: DayRow[]; }

export const WEEKS: WeekDef[] = [
  {
    week: 1, phase: "Foundation", loaded: false,
    note: "Ease in. Pick a tier you can run with clean form for all five sessions.",
    days: [
      { day: 1, session: "Hips & Hamstrings", train: true },
      { day: 2, session: "Thoracic Spine & Shoulders", train: true },
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
      { day: 1, session: "Hips & Hamstrings (Progress)", train: true },
      { day: 2, session: "Thoracic Spine & Shoulders (Progress)", train: true },
      { day: 3, session: "Full-Body Flow & Breath", train: true },
      { day: 4, session: "Ankles & Deep Squat (Progress)", train: true },
      { day: 5, session: "Posterior Chain & Wind-Down (Progress)", train: true },
      { day: 6, session: "Active Recovery - walk / cycle / swim", train: false },
      { day: 7, session: "Rest", train: false },
    ],
  },
  {
    week: 3, phase: "Progression", loaded: true,
    note: "Sessions are now 25–30 min. Warm up 2–3 min first. Load starts here.",
    days: [
      { day: 1, session: "Hips & Hamstrings (Loaded)", train: true },
      { day: 2, session: "Thoracic Spine & Shoulders (Loaded)", train: true },
      { day: 3, session: "Full-Body Flow (Athletic)", train: true },
      { day: 4, session: "Ankles & Deep Squat (Loaded)", train: true },
      { day: 5, session: "Posterior Chain (Loaded)", train: true },
      { day: 6, session: "Active Recovery - walk / cycle / swim", train: false },
      { day: 7, session: "Rest", train: false },
    ],
  },
  {
    week: 4, phase: "Progression", loaded: true,
    note: "Final push. Hold form over load - a clean rep beats a heavy ugly one.",
    days: [
      { day: 1, session: "Hips & Hamstrings (Loaded)", train: true },
      { day: 2, session: "Thoracic Spine & Shoulders (Loaded)", train: true },
      { day: 3, session: "Full-Body Flow (Athletic)", train: true },
      { day: 4, session: "Ankles & Deep Squat (Loaded)", train: true },
      { day: 5, session: "Posterior Chain (Loaded)", train: true },
      { day: 6, session: "Active Recovery - walk / cycle / swim", train: false },
      { day: 7, session: "Rest", train: false },
    ],
  },
];

export const TOTAL_DAYS = 28;

// ---------------------------------------------------------------------------
// Progress for the Home ring.
// We read the worksheet's saved log straight from localStorage (same key the
// Worksheet writes to) and count days that are "done":
//   - a training day where EVERY stretch is ticked, or
//   - a recovery/rest day marked done.
// This mirrors the Worksheet's own rules, so Home and Worksheet always agree.
// ---------------------------------------------------------------------------

interface EntryLike { stretchDone?: Record<number, boolean>; rested?: boolean; }
interface LogLike { entries?: Record<string, EntryLike>; }

const LOG_KEY = "unstuck:worksheet-log";

function stretchCount(week: number, day: number): number {
  return phaseForWeek(week).days.find((d) => d.day === day)?.exercises.length ?? 0;
}

function readLog(): LogLike {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "{}");
  } catch {
    return {}; /* unreadable storage -> treat as no progress */
  }
}

function isDayDone(entries: Record<string, EntryLike>, week: number, day: DayRow): boolean {
  const e = entries[`w${week}d${day.day}`];
  if (!e) return false;
  if (day.train) {
    const count = stretchCount(week, day.day);
    if (count === 0) return false;
    for (let i = 0; i < count; i++) if (!e.stretchDone?.[i]) return false;
    return true;
  }
  return !!e.rested;
}

export function daysDone(): number {
  const entries = readLog().entries ?? {};
  let n = 0;
  for (const w of WEEKS) {
    for (const d of w.days) if (isDayDone(entries, w.week, d)) n++;
  }
  return n;
}

// The first day (in week/day order) that isn't done yet - where Home's CTA
// should land you. If the whole program is finished, points at the last day.
export function nextDue(): { week: number; day: number } {
  const entries = readLog().entries ?? {};
  for (const w of WEEKS) {
    for (const d of w.days) {
      if (!isDayDone(entries, w.week, d)) return { week: w.week, day: d.day };
    }
  }
  return { week: 4, day: 7 };
}
