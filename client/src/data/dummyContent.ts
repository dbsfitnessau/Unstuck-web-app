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
export interface Vocab { term: string; sub: string; meaning: string; why: string; }
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
    { term: "CARs", sub: "Controlled Articular Rotations", meaning: "Active, full-range circles of one joint, slow and deliberate. Daily input from Week 1.", why: "Trains the joint to own its full range - under your own control." },
    { term: "PAILs", sub: "Progressive Angular Isometric Loading", meaning: "At end range, isometrically push the stretched tissue into the floor or wall for 20 seconds at moderate effort.", why: "Builds force production at end range." },
    { term: "RAILs", sub: "Regressive Angular Isometric Loading", meaning: "At end range, actively pull yourself deeper using the opposite muscles for 20 seconds.", why: "Trains active control of new range." },
    { term: "End range", sub: "", meaning: "The deepest position you can get into.", why: "Where adaptation lives - and injuries too, if untrained." },
    { term: "Closed-chain", sub: "", meaning: "Hand or foot is fixed (e.g. squat, push-up).", why: "More stable, more carryover to athletic positions." },
    { term: "Open-chain", sub: "", meaning: "Limb moves freely (e.g. seated leg raise).", why: "Useful for isolation, less carryover." },
    { term: "Capsule", sub: "", meaning: "The connective sleeve around a joint.", why: "The deepest layer of \"tightness.\" Slowest to adapt." },
    { term: "Fascia", sub: "", meaning: "Connective tissue that wraps around everything.", why: "Real and important - but probably not what you think it is." },
    { term: "Active control", sub: "", meaning: "Force production you generate at a given range.", why: "The whole point of this programme." },
  ] as Vocab[],
  faq: [
    { q: "What if I miss a session?", a: "One missed session in 28 days is noise - pick up where you left off, don't double up. Two or more in a week - restart the week. Consistent stimulus beats heroics." },
    { q: "Should I train through DOMS?", a: "Mobility, yes. It's often the best thing for sore muscles. Skip loaded end-range work if soreness is sharp or limits clean form. Drop a tier and keep moving." },
    { q: "What if I'm sick?", a: "Above the neck (head cold, mild sore throat) - keep moving on the easy tier, skip breath holds. Below the neck (chest, fever, body aches) - rest fully, then resume where you stopped." },
    { q: "Can I split a session in two?", a: "Yes. 10 minutes in the morning + 10 minutes in the evening works. Keep the order: CARs first, breath last." },
    { q: "When to slot mobility around your other training?", a: "If you train in the morning, do mobility in the evening (or before bed) - keeps you fresh for the lift.\nIf you train in the afternoon or evening, do mobility in the morning - primes the joints for later loading.\nAvoid stacking a long deep-squat hold immediately before heavy squats. End-range mobility temporarily reduces stiffness, which you actually want for max strength." },
    { q: "Travelling, no equipment?", a: "Run the Recreational tier (green) of every session. The bodyweight version of this program is a complete program." },
    { q: "Pregnant or postpartum?", a: "See the disclaimer. Don't run this version. Work with a women's health physio on a custom adaptation." },
    { q: "Keep the maintenance dose forever?", a: "Yes, that's the design. Re-run the full 28 days when a quarterly retest slips, after an injury or layoff, or before a big training block." },
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
  // number fields that can legitimately go below zero (e.g. sit-and-reach, where
  // stopping short of the toes is negative). These render −/+ buttons, because a
  // phone's number pad has no minus key — without it the value can't be entered
  // on mobile at all. Leave unset for distances and times, which can't be negative.
  signed?: boolean;
  // Wording for the −/+ buttons on a signed field, as [negative, positive].
  // Defaults to a bare "–" and "+"; set it when plain words read better than
  // signs (sit-and-reach says "Short" / "Past" rather than minus and plus).
  signLabels?: [string, string];
}

export interface TestScore {
  label: string;             // scorecard row label
  unit: string;              // scorecard unit
  field?: string;            // scorecard value = this field's value
  averageOf?: [string, string]; // scorecard value = mean of these two fields
  averageLabel?: string;     // on-card label for the computed average row
  // 0–10 scoring anchors: the raw value that scores 0/10 and the one that
  // scores 10/10. Values in between map linearly and clamp to 0..10. Set
  // tenAt < zeroAt for "lower is better" tests (asymmetry, distance-to-wall) —
  // the same maths then scores them the right way round. Anchored to the
  // program's published benchmarks (UNSTUCK_01_Main_Program_REVISED.md);
  // change any number here to re-scale a test's 0–10 score.
  zeroAt?: number;           // raw value that scores 0/10
  tenAt?: number;            // raw value that scores 10/10
}

export interface MobilityTest {
  id: string;
  name: string;                     // card heading
  setup: string;
  // "How to measure this" — shown full-width above the fields. Lives here rather
  // than on a field because the left/right columns are far too narrow on a phone
  // to hold an instruction, and the method is usually the same for both sides.
  measureNote?: string;
  // Show the gap between two numeric fields on the card, as a positive number.
  // Purely informational — side-to-side balance is worth seeing, but scoring it
  // would rank someone equally tight on both sides as perfect. Record each side
  // and let the app subtract; never ask for a difference to be worked out by hand.
  showDifference?: { of: [string, string]; label: string };
  fields: TestField[];
  score: TestScore | null;          // null = not shown in the scorecard
  sideHeadings?: [string, string];  // column headers for the L/R block
  image?: string;                   // demo reference photo (lives in /exercises/)
}

export const tests: MobilityTest[] = [
  {
    id: "deep-squat",
    name: "Deep Squat Hold",
    setup: "Stand with feet shoulder-width apart, toes pointing forward, and hold hands to chest. Slowly lower your hips as deep as possible, descending until your thighs break parallel below the level of your knees. Pause and hold the absolute bottom position, while maintaining balance and posture.",
    fields: [
      { key: "heels", type: "check", label: "Heels stay down throughout?" },
      { key: "knees", type: "check", label: "Knees track over toes throughout?" },
      { key: "spine", type: "check", label: "Spine stays long throughout?" },
      { key: "hold", type: "number", label: "Hold time before form breaks (or 60 seconds+)", unit: "seconds" },
    ],
    score: { label: "Deep Squat Hold", unit: "sec", field: "hold", zeroAt: 0, tenAt: 60 },
    image: "/exercises/deep-squat-hold.jpg",
  },
  {
    id: "wall-ankle",
    name: "Wall Ankle Test",
    setup: "Put one foot next to the tape measure. Slowly bend your front knee forward to touch the wall. If your knee touches easily, move your foot back from the wall. If your heel lifts up or your knee cannot reach, move your foot closer. Measure distance from big toe to wall.",
    sideHeadings: ["Left leg", "Right leg"],
    fields: [
      { key: "heelL", type: "check", label: "Heel stayed down", side: "left" },
      { key: "toeL", type: "number", label: "Toe to wall", unit: "cm", side: "left" },
      { key: "heelR", type: "check", label: "Heel stayed down", side: "right" },
      { key: "toeR", type: "number", label: "Toe to wall", unit: "cm", side: "right" },
    ],
    score: { label: "Wall Ankle (Knee-to-Wall)", unit: "cm", averageOf: ["toeL", "toeR"], averageLabel: "Average (Toe to wall)", zeroAt: 0, tenAt: 13 },
    image: "/exercises/wall-ankle-test.jpg",
  },
  {
    id: "sit-reach",
    name: "Sit and Reach",
    setup: "Sit on the floor with your legs straight out in front of you. Place the bottoms of your feet flat against a measuring tape. Keep your knees flat and locked on the floor. Reach forward from the hips slowly as far as you can. Hold your furthest reach for a moment and measure where fingertips land.",
    fields: [
      { key: "longspine", type: "check", label: "Did you stay long-spined?" },
      { key: "dist", type: "number", label: "Distance past or short of toes", unit: "cm (+/–)", signed: true, signLabels: ["Short of toes", "Past toes"] },
    ],
    // Symmetric about the toes on purpose: fingertips level with your toes is the
    // neutral mark and scores 5/10, 15cm past scores 10, 15cm short scores 0. See
    // the Benchmark note in UNSTUCK_01_Main_Program_REVISED.md, Test 3.
    score: { label: "Sit and Reach", unit: "cm (+/-)", field: "dist", zeroAt: -15, tenAt: 15 },
    image: "/exercises/sit-and-reach.jpg",
  },
  {
    id: "wall-shoulder",
    name: "Wall Shoulder Flexion",
    setup: "Stand with your back, glutes, and head touching a flat wall. Keep your feet a few inches away from the base. Press your lower back into the wall so there is no large gap. Keep your elbows straight and thumbs pointing up, then slowly lift both arms straight up toward the ceiling and back toward the wall. See if your thumbs and arms can touch the wall without your lower back arching away from it.",
    fields: [
      { key: "hands", type: "check", label: "Hands touch the wall?" },
      { key: "lowback", type: "choice", label: "Low back stays in contact?", options: ["Yes", "Lifted slightly", "Lifted heavily"] },
      { key: "wrist", type: "number", label: "Wrist to wall distance", unit: "cm" },
    ],
    score: { label: "Wall Shoulder Flexion", unit: "cm", field: "wrist", zeroAt: 20, tenAt: 0 },
    image: "/exercises/wall-shoulder-flexion.jpg",
  },
  {
    id: "thomas",
    name: "Thomas Test",
    setup: "Lie back on a bed or bench edge, hug one knee to chest, let the other leg hang. Swap sides. Measure the distance from the bottom of your lower leg to the top of the horizontal surface.",
    sideHeadings: ["Left leg down", "Right leg down"],
    fields: [
      { key: "thighL", type: "check", label: "Thigh at or below horizontal?", side: "left" },
      { key: "kneeL", type: "check", label: "Knee bend ~80°+ at the knee joint?", side: "left" },
      { key: "angleL", type: "number", label: "If above, how far above horizontal?", unit: "°", side: "left" },
      { key: "thighR", type: "check", label: "Thigh at or below horizontal?", side: "right" },
      { key: "kneeR", type: "check", label: "Knee bend ~80°+ at the knee joint?", side: "right" },
      { key: "angleR", type: "number", label: "If above, how far above horizontal?", unit: "°", side: "right" },
    ],
    showDifference: { of: ["angleL", "angleR"], label: "Difference between sides" },
    // Scored on the AVERAGE of the two legs, not the gap between them: hip flexor
    // length is what the programme trains, and scoring the gap alone would hand
    // 10/10 to someone equally tight on both sides. 25° -> 0/10, flat -> 10/10,
    // matching the 0–25° range the main programme quotes for this test.
    score: {
      label: "Thomas Test",
      unit: "°",
      averageOf: ["angleL", "angleR"],
      averageLabel: "Average (above horizontal)",
      zeroAt: 25,
      tenAt: 0,
    },
    image: "/exercises/thomas-test.jpg",
  },
  {
    id: "tspine-rot",
    name: "Seated Thoracic Rotation",
    setup: "Sit on a chair or box with your feet flat. Knees and feet pinned tightly together to lock the lower body. Place a light stick across the top of your shoulders, holding it with your hands. Turn your upper body as far as possible to the right, then to the left.",
    sideHeadings: ["Left", "Right"],
    fields: [
      { key: "hipL", type: "check", label: "Left hip lifted?", side: "left" },
      { key: "rotL", type: "number", label: "Rotation", unit: "°", side: "left" },
      { key: "hipR", type: "check", label: "Right hip lifted?", side: "right" },
      { key: "rotR", type: "number", label: "Rotation", unit: "°", side: "right" },
    ],
    score: { label: "Seated Thoracic Rotation", unit: "°", averageOf: ["rotL", "rotR"], averageLabel: "Rotation Average", zeroAt: 0, tenAt: 45 },
    image: "/exercises/seated-thoracic-rotation.jpg",
  },
  {
    id: "cossack",
    name: "Cossack Squat Depth",
    setup: "Stand with your feet much wider than your shoulders. Slowly bend one knee and push your hips down and back toward that heel. Keep your opposite leg completely straight with your foot flat. Try to keep the heel of your bending foot flat on the floor. Notice how low you can go without your heel rising or your chest collapsing forward.",
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
    score: { label: "Cossack Squat Depth", unit: "cm", averageOf: ["hipfloorL", "hipfloorR"], averageLabel: "Hip off floor average", zeroAt: 25, tenAt: 0 },
    image: "/exercises/cossack-squat-depth.jpg",
  },
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
  ...cheatsheet.vocabulary.map((v) => ({ title: v.term, text: v.sub + " " + v.meaning + " " + v.why, surface: "Home", path: "/home" })),
  ...cheatsheet.faq.map((f) => ({ title: f.q, text: f.a, surface: "Home", path: "/home" })),
  ...tests.map((t) => ({ title: t.name, text: t.setup + " " + t.fields.map((f) => f.label).join(" "), surface: "Assessment", path: "/testing" })),
  ...programSearch,
];
