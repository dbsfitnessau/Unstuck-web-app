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
    { q: "What you'll need", a: "Phone for photos/video · tape measure · dowel or broomstick · stable bench or bed · low block or stair · clear wall space." },
    { q: "What if I miss a session?", a: "One missed session in 28 days is noise - pick up where you left off. Two+ in a week, restart the week." },
    { q: "Should I train through DOMS?", a: "Mobility, yes - often the best thing for sore muscles. Skip loaded end-range work if soreness is sharp." },
    { q: "What if I'm travelling with no equipment?", a: "Run the 🟢 tier of every session. The bodyweight version is a complete program." },
  ] as Faq[],
};

// ---- The 7 tests ----
// Each test is a list of FIELDS. A field is a tick (pass/fail), a number (a
// measurement), or a choice (one of a few options). A field tagged with a
// `side` ("left"/"right") renders inside a two-column block, so a left/right
// assessment reads differently from a single full-body test. `score` says how
// the scorecard value is derived: either a single field, or the average of two
// (e.g. left + right toe-to-wall). `sideHeadings` labels the two columns.
export type TestFieldType = "check" | "number" | "choice";

export interface TestField {
  key: string;               // unique within the test; also the per-field storage key
  type: TestFieldType;
  label: string;
  side?: "left" | "right";   // present → renders in the L/R two-column block
  unit?: string;             // number fields (e.g. "cm", "°", "seconds")
  options?: string[];        // choice fields
}

export interface TestScore {
  label: string;             // scorecard row label
  unit: string;              // scorecard unit
  field?: string;            // scorecard value = this field's value
  averageOf?: [string, string]; // scorecard value = mean of these two fields
  averageLabel?: string;     // on-card label for the computed average row
}

export interface MobilityTest {
  id: string;
  name: string;                     // card heading
  setup: string;
  fields: TestField[];
  score: TestScore | null;          // null = not shown in the scorecard
  sideHeadings?: [string, string];  // column headers for the L/R block
  image?: string;                   // demo reference photo (lives in /exercises/)
}

export const tests: MobilityTest[] = [
  {
    id: "deep-squat",
    name: "Deep Squat Hold",
    setup: "Feet shoulder-width, toes slightly out. Sink deep with clean form, hold until form breaks or 60 seconds.",
    fields: [
      { key: "heels", type: "check", label: "Heels stay down throughout?" },
      { key: "knees", type: "check", label: "Knees track over toes throughout?" },
      { key: "spine", type: "check", label: "Spine stays long throughout?" },
      { key: "hold", type: "number", label: "Hold time before form breaks (or 60 seconds+)", unit: "seconds" },
    ],
    score: { label: "Deep Squat Hold", unit: "sec", field: "hold" },
    image: "/exercises/deep-squat-hold.jpg",
  },
  {
    id: "wall-ankle",
    name: "Wall Ankle Test",
    setup: "Half-kneel facing wall, drive knee to wall with heel glued down. Measure toe-to-wall.",
    sideHeadings: ["Left leg", "Right leg"],
    fields: [
      { key: "heelL", type: "check", label: "Heel stayed down", side: "left" },
      { key: "toeL", type: "number", label: "Toe to wall", unit: "cm", side: "left" },
      { key: "heelR", type: "check", label: "Heel stayed down", side: "right" },
      { key: "toeR", type: "number", label: "Toe to wall", unit: "cm", side: "right" },
    ],
    score: { label: "Wall Ankle (Knee-to-Wall)", unit: "cm", averageOf: ["toeL", "toeR"], averageLabel: "Average (Toe to wall)" },
    image: "/exercises/wall-ankle-test.jpg",
  },
  {
    id: "sit-reach",
    name: "Sit and Reach",
    setup: "Sit tall, legs straight, feet flexed. Hinge from hips, reach past toes without rounding hard.",
    fields: [
      { key: "longspine", type: "check", label: "Did you stay long-spined?" },
      { key: "dist", type: "number", label: "Distance past or short of toes", unit: "cm (+/–)" },
    ],
    score: { label: "Sit and Reach", unit: "cm (+/-)", field: "dist" },
    image: "/exercises/sit-and-reach.jpg",
  },
  {
    id: "wall-shoulder",
    name: "Wall Shoulder Flexion",
    setup: "Back, head, glutes and heels on wall. Arms overhead, try to touch the wall without arching.",
    fields: [
      { key: "hands", type: "check", label: "Hands touch the wall?" },
      { key: "lowback", type: "choice", label: "Low back stays in contact?", options: ["Yes", "Lifted slightly", "Lifted heavily"] },
      { key: "wrist", type: "number", label: "Wrist to wall distance", unit: "cm" },
    ],
    score: { label: "Wall Shoulder Flexion", unit: "cm", field: "wrist" },
    image: "/exercises/wall-shoulder-flexion.jpg",
  },
  {
    id: "thomas",
    name: "Thomas Test",
    setup: "Lie back on a bench edge, hug one knee to chest, let the other leg hang. Swap sides.",
    sideHeadings: ["Left leg down", "Right leg down"],
    fields: [
      { key: "thighL", type: "check", label: "Thigh at or below horizontal?", side: "left" },
      { key: "kneeL", type: "check", label: "Knee bend ~80°+ at the knee joint?", side: "left" },
      { key: "thighR", type: "check", label: "Thigh at or below horizontal?", side: "right" },
      { key: "kneeR", type: "check", label: "Knee bend ~80°+ at the knee joint?", side: "right" },
      { key: "asym", type: "number", label: "Asymmetry", unit: "°" },
    ],
    score: { label: "Thomas Test", unit: "°", field: "asym" },
    image: "/exercises/thomas-test.jpg",
  },
  {
    id: "tspine-rot",
    name: "Seated Thoracic Rotation",
    setup: "Sit with a cushion between knees, arms crossed. Rotate each way without lifting hips (target: 45°+).",
    sideHeadings: ["Left", "Right"],
    fields: [
      { key: "hipL", type: "check", label: "Left hip lifted?", side: "left" },
      { key: "rotL", type: "number", label: "Rotation", unit: "°", side: "left" },
      { key: "hipR", type: "check", label: "Right hip lifted?", side: "right" },
      { key: "rotR", type: "number", label: "Rotation", unit: "°", side: "right" },
    ],
    score: { label: "Seated Thoracic Rotation", unit: "°", averageOf: ["rotL", "rotR"], averageLabel: "Rotation Average" },
    image: "/exercises/seated-thoracic-rotation.jpg",
  },
  {
    id: "cossack",
    name: "Cossack Squat Depth",
    setup: "Wide stance, shift to one leg, sink down. Loaded heel down, hip below knee, straight leg flexed.",
    sideHeadings: ["Left side", "Right side"],
    fields: [
      { key: "heelL", type: "check", label: "Heel down?", side: "left" },
      { key: "hipkneeL", type: "check", label: "Hip below knee?", side: "left" },
      { key: "legL", type: "check", label: "Straight leg fully flexed?", side: "left" },
      { key: "hipfloorL", type: "number", label: "Hip off floor", unit: "cm", side: "left" },
      { key: "heelR", type: "check", label: "Heel down?", side: "right" },
      { key: "hipkneeR", type: "check", label: "Hip below knee?", side: "right" },
      { key: "legR", type: "check", label: "Straight leg fully flexed?", side: "right" },
      { key: "hipfloorR", type: "number", label: "Hip off floor", unit: "cm", side: "right" },
    ],
    score: { label: "Cossack Squat Depth", unit: "cm", averageOf: ["hipfloorL", "hipfloorR"], averageLabel: "Hip off floor average" },
    image: "/exercises/cossack-squat-depth.jpg",
  },
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
        // Deep-link straight to this movement's session (first occurrence), so a
        // search result opens the exercise instead of the Program week-picker.
        // phase.weeks[0] = 1 (Foundation) or 3 (Progression) → Program maps it back.
        const path = `/program?week=${phase.weeks[0]}&day=${day.day}&ex=${encodeURIComponent(e.name)}`;
        items.push({ title: e.name, text: `${e.setsReps} ${e.notes} ${Object.values(e.tier).join(" ")}`, surface: "Program", path });
      }
    }
  }
  return items;
})();

export const searchIndex: SearchItem[] = [
  ...cheatsheet.principles.map((p) => ({ title: p.title, text: p.body + " " + p.practical, surface: "Home", path: "/home" })),
  ...cheatsheet.vocabulary.map((v) => ({ title: v.term, text: v.meaning + " " + v.why, surface: "Home", path: "/home" })),
  ...cheatsheet.faq.map((f) => ({ title: f.q, text: f.a, surface: "Home", path: "/home" })),
  ...tests.map((t) => ({ title: t.name, text: t.setup + " " + t.fields.map((f) => f.label).join(" "), surface: "Assessment", path: "/testing" })),
  ...programSearch,
];
