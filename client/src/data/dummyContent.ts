// ---------------------------------------------------------------------------
// Dummy content for Milestone 1.
// This is a realistic SLICE of the real UNSTUCK docs - enough to build and test
// every screen. In a later milestone this gets replaced by the parsed markdown
// or an API response, but the SHAPES (types) below can stay the same.
// ---------------------------------------------------------------------------

import { phases } from "./program";

export type Tier = "green" | "amber" | "red";

export const TIERS: { id: Tier; emoji: string; label: string }[] = [
  { id: "green", emoji: "🟢", label: "Recreational" },
  { id: "amber", emoji: "🟡", label: "Intermediate" },
  { id: "red", emoji: "🔴", label: "Athlete" },
];

// ---- Shared safety content (appears on multiple screens) ----
export const STOP_SIGNS: string[] = [
  "Sharp pain → stop.",
  "Pins-and-needles or numbness → stop and see a physio.",
  "Pain getting worse rep-to-rep → back off depth or load.",
  "Joint clicking with pain → stop. (Painless clicking is usually fine.)",
  "Pain (not ordinary soreness) lingering >48h → reduce volume next session.",
];

export const CONTRAINDICATIONS =
  "Not for pregnancy or early postpartum, recent surgery, or anyone with a history of disc symptoms attempting any loaded spinal flexion. When in doubt, drop to 🟢, small range, no load - and see a physio.";

// ---- Cheatsheet ----
export interface Principle { title: string; body: string; practical: string; }
export interface Vocab { term: string; meaning: string; why: string; }
export interface Faq { q: string; a: string; }

export const cheatsheet = {
  principles: [
    {
      title: "Tightness is often a nervous-system signal - not just a short muscle.",
      body: "A lot of what you feel as 'tight' is a protective output from your Central Nervous System deciding a range is unsafe. Stretch tolerance changes faster than tissue length.",
      practical: "Long exhales. Time under tension. Don't force depth - earn it.",
    },
    {
      title: "Joints adapt to the angles you load them at.",
      body: "Your hip capsule remodels in response to the loads and angles you put it through. Range you don't visit, your body builds away from.",
      practical: "Range you don't load is range you lose. Visit end ranges weekly.",
    },
    {
      title: "Passive range and active range are different - the gap is where you get hurt.",
      body: "Passive = what gravity can push you into. Active = what you can produce yourself. A hamstring that lengthens but can't produce force at end range is exposed.",
      practical: "Passive flexibility without active strength is decorative. Train both.",
    },
    {
      title: "Tendons and capsules adapt slower than muscles.",
      body: "Muscle responds within hours; tendons and capsules adapt on an 8–12 week timescale. Weeks 1–2 lean on nervous-system gains; Weeks 3–4 start the durable connective-tissue work.",
      practical: "Don't expect big structural change before Week 3. Be patient.",
    },
    {
      title: "Mobility responds to recovery, not just to work.",
      body: "Connective-tissue adaptation needs sleep and food like any other adaptation. If a re-test goes backwards, the answer is rarely 'stretch harder'.",
      practical: "Work, recover, repeat. Sleep is mobility training.",
    },
  ] as Principle[],
  vocabulary: [
    { term: "CARs", meaning: "Controlled Articular Rotations - slow, full-range circles of one joint.", why: "Trains the joint to own its full range under your own control." },
    { term: "PAILs", meaning: "At end range, push the stretched tissue into the floor/wall ~20s.", why: "Builds force production at end range." },
    { term: "RAILs", meaning: "At end range, pull yourself deeper using the opposite muscles ~20s.", why: "Trains active control of new range." },
    { term: "End range", meaning: "The deepest position you can get into.", why: "Where adaptation lives - and where injuries live if untrained." },
    { term: "Joint capsule", meaning: "The connective sleeve around a joint.", why: "The deepest layer of 'tightness'. Slowest to adapt." },
  ] as Vocab[],
  faq: [
    { q: "What if I miss a session?", a: "One missed session in 28 days is noise - pick up where you left off. Two+ in a week, restart the week." },
    { q: "Should I train through DOMS?", a: "Mobility, yes - often the best thing for sore muscles. Skip loaded end-range work if soreness is sharp." },
    { q: "What if I'm travelling with no equipment?", a: "Run the 🟢 tier of every session. The bodyweight version is a complete program." },
  ] as Faq[],
};

// ---- The 7 tests ----
export interface MobilityTest {
  id: string;
  name: string;
  setup: string;
  checks: string[];          // pass/fail items
  metric: { label: string; unit: string } | null; // numeric field, if any
  image?: string;            // demo photo (lives in client/public/tests/)
}

export const tests: MobilityTest[] = [
  { id: "deep-squat", name: "Deep Squat Hold", setup: "Feet shoulder-width, toes slightly out. Sink deep with clean form, hold until form breaks or 60s.", checks: ["Heels stay down", "Knees track over toes", "Spine stays long"], metric: { label: "Clean hold time", unit: "sec" } },
  { id: "wall-ankle", name: "Wall Ankle (Knee-to-Wall)", setup: "Half-kneel facing wall, drive knee to wall with heel glued down. Measure toe-to-wall.", checks: ["Heel stayed down (left)", "Heel stayed down (right)"], metric: { label: "Toe-to-wall", unit: "cm" } },
  { id: "sit-reach", name: "Sit and Reach (Modified)", setup: "Sit tall, legs straight, feet flexed. Hinge from hips, reach past toes without rounding hard.", checks: ["Stayed long-spined"], metric: { label: "Past/short of toes", unit: "cm (+/-)" } },
  { id: "wall-shoulder", name: "Wall Shoulder Flexion", setup: "Back, head, bum and heels on wall. Arms overhead, try to touch the wall without arching.", checks: ["Hands touch the wall", "Low back stays in contact"], metric: { label: "Wrist-to-wall", unit: "cm" } },
  { id: "thomas", name: "Thomas Test", setup: "Lie back on a bench edge, hug one knee to chest, let the other leg hang. Swap sides.", checks: ["Left thigh at/below horizontal", "Right thigh at/below horizontal"], metric: null },
  { id: "tspine-rot", name: "Seated Thoracic Rotation", setup: "Sit with a cushion between knees, arms crossed. Rotate each way without lifting hips.", checks: ["Hips stayed planted"], metric: { label: "Rotation (avg)", unit: "°" } },
  { id: "cossack", name: "Cossack Squat Depth", setup: "Wide stance, shift to one leg, sink down. Loaded heel down, hip below knee, straight leg flexed.", checks: ["Heel down (both sides)", "Hip below knee (both sides)", "Straight leg fully flexed"], metric: null },
];

// ---- Program ----
export const schedule = [
  { day: "Day 1 (Mon)", focus: "Hips & Hamstrings", wk12: "20 min", wk34: "25–30 min" },
  { day: "Day 2 (Tue)", focus: "Thoracic Spine & Shoulders", wk12: "20 min", wk34: "25–30 min" },
  { day: "Day 3 (Wed)", focus: "Full-Body Flow & Breath", wk12: "20 min", wk34: "25–30 min" },
  { day: "Day 4 (Thu)", focus: "Ankles & Deep Squat", wk12: "20 min", wk34: "25–30 min" },
  { day: "Day 5 (Fri)", focus: "Posterior Chain & Wind-Down", wk12: "20 min", wk34: "25–30 min" },
  { day: "Sat", focus: "Active recovery - walk, cycle, or swim", wk12: "-", wk34: "-" },
  { day: "Sun", focus: "Full rest or easy walk", wk12: "-", wk34: "-" },
];

// Full program data (all days, both phases) lives in ./program.ts.
// We import `phases` above to build the search index.

// ---------------------------------------------------------------------------
// Search index: a flat list of everything searchable, each item tagged with the
// screen it lives on so search results can link there. Building this once here
// keeps the search component dead simple.
// ---------------------------------------------------------------------------
export interface SearchItem { title: string; text: string; surface: string; path: string; }

// De-duplicate program exercises by name (many repeat across days/phases).
const programSearch: SearchItem[] = (() => {
  const seen = new Set<string>();
  const items: SearchItem[] = [];
  for (const phase of phases) {
    for (const day of phase.days) {
      for (const e of day.exercises) {
        if (seen.has(e.name)) continue;
        seen.add(e.name);
        items.push({ title: e.name, text: `${e.setsReps} ${e.notes} ${Object.values(e.tier).join(" ")}`, surface: "Program", path: "/program" });
      }
    }
  }
  return items;
})();

export const searchIndex: SearchItem[] = [
  ...cheatsheet.principles.map((p) => ({ title: p.title, text: p.body + " " + p.practical, surface: "Home", path: "/home" })),
  ...cheatsheet.vocabulary.map((v) => ({ title: v.term, text: v.meaning + " " + v.why, surface: "Home", path: "/home" })),
  ...cheatsheet.faq.map((f) => ({ title: f.q, text: f.a, surface: "Home", path: "/home" })),
  ...tests.map((t) => ({ title: t.name, text: t.setup + " " + t.checks.join(" "), surface: "Assessment", path: "/testing" })),
  ...programSearch,
];
