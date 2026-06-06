import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Session timer for the Worksheet. Two modes:
//   • Hold        - a plain countdown (30 / 45 / 60 / 90s presets) for static holds.
//   • PAILs·RAILs - a GUIDED sequence: 60s hold → 20s PAILs → 20s RAILs, with an
//                   optional second cycle (the 🔴 tier does two). Auto-advances
//                   between phases and beeps/vibrates at each change.
//
// IMPORTANT design choice - the countdown is DEADLINE-based, not tick-based.
// When a phase starts we record the wall-clock time it should END (`endAt`).
// Every tick we compute "seconds left" = endAt − now. We do NOT decrement a
// counter. Why: a decrement-per-tick timer runs too fast if more than one
// interval ever fires per second (which React StrictMode / hot-reload can
// cause). Deriving from the clock makes the displayed time correct no matter
// how often (or how rarely - e.g. a throttled background tab) the tick runs.
// ---------------------------------------------------------------------------

interface Phase {
  label: string;
  seconds: number;
  tone: "hold" | "pails" | "rails";
}

const holdPhases = (seconds: number): Phase[] => [{ label: "Hold", seconds, tone: "hold" }];

const pailsRailsPhases = (rounds: number): Phase[] => {
  const phases: Phase[] = [{ label: "Hold", seconds: 60, tone: "hold" }];
  for (let r = 0; r < rounds; r++) {
    phases.push({ label: "PAILs - push", seconds: 20, tone: "pails" });
    phases.push({ label: "RAILs - pull deeper", seconds: 20, tone: "rails" });
  }
  return phases;
};

interface TimerState {
  phases: Phase[];
  phaseIndex: number;
  secondsLeft: number;
  running: boolean;
  finished: boolean;
  endAt: number | null; // wall-clock ms when the current phase ends; null when paused
}

const makeState = (phases: Phase[]): TimerState => ({
  phases,
  phaseIndex: 0,
  secondsLeft: phases[0].seconds,
  running: false,
  finished: false,
  endAt: null,
});

// --- Audio + haptics ------------------------------------------------------
// One shared AudioContext, created lazily on the first beep (which only ever
// happens after the user has pressed Start - browsers require a user gesture
// before audio can play).
let audioCtx: AudioContext | null = null;
function beep(times = 1) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    let t = audioCtx.currentTime;
    for (let i = 0; i < times; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
      t += 0.28;
    }
  } catch {
    // Audio unavailable (e.g. autoplay blocked) - the visual countdown still works.
  }
}
function vibrate(pattern: number | number[]) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* not supported - ignore */
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Timer() {
  const [mode, setMode] = useState<"hold" | "pailsrails">("hold");
  const [holdSeconds, setHoldSeconds] = useState(60);
  const [rounds, setRounds] = useState(1);
  const [state, setState] = useState<TimerState>(() => makeState(holdPhases(60)));

  // Beep on phase CHANGE and on completion. We do this in effects (watching the
  // values) rather than inside the tick, so the state updater stays pure - pure
  // updaters are safe under React StrictMode's intentional double-invocation.
  const prevPhase = useRef(0);
  useEffect(() => {
    if (state.phaseIndex !== prevPhase.current) {
      prevPhase.current = state.phaseIndex;
      if (state.running) { beep(1); vibrate(250); }
    }
  }, [state.phaseIndex, state.running]);
  useEffect(() => {
    if (state.finished) { beep(2); vibrate([200, 120, 200]); }
  }, [state.finished]);

  // The clock. One interval while running; it only READS the deadline and
  // recomputes seconds-left - it never decrements a counter.
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      setState((s) => {
        if (!s.running || s.endAt == null) return s;
        const remMs = s.endAt - Date.now();
        if (remMs > 250) {
          const secs = Math.ceil(remMs / 1000);
          return secs === s.secondsLeft ? s : { ...s, secondsLeft: secs };
        }
        // Current phase has elapsed.
        if (s.phaseIndex < s.phases.length - 1) {
          const ni = s.phaseIndex + 1;
          const next = s.phases[ni];
          return { ...s, phaseIndex: ni, secondsLeft: next.seconds, endAt: Date.now() + next.seconds * 1000 };
        }
        return { ...s, secondsLeft: 0, running: false, finished: true, endAt: null };
      });
    }, 200);
    return () => clearInterval(id);
  }, [state.running]);

  // Load a fresh sequence for the current settings (also used by Reset).
  function reset(nextMode = mode, nextHold = holdSeconds, nextRounds = rounds) {
    const phases = nextMode === "hold" ? holdPhases(nextHold) : pailsRailsPhases(nextRounds);
    prevPhase.current = 0;
    setState(makeState(phases));
  }

  function toggleRun() {
    setState((s) => {
      if (s.finished) {
        // Restart from the top.
        const phases = mode === "hold" ? holdPhases(holdSeconds) : pailsRailsPhases(rounds);
        prevPhase.current = 0;
        return { ...makeState(phases), running: true, endAt: Date.now() + phases[0].seconds * 1000 };
      }
      if (s.running) {
        // Pause: freeze seconds-left from the clock, drop the deadline.
        const remMs = s.endAt ? s.endAt - Date.now() : s.secondsLeft * 1000;
        return { ...s, running: false, secondsLeft: Math.max(0, Math.ceil(remMs / 1000)), endAt: null };
      }
      // Resume / start: set the deadline from the frozen seconds-left.
      return { ...s, running: true, endAt: Date.now() + s.secondsLeft * 1000 };
    });
  }

  const current = state.phases[state.phaseIndex];

  return (
    <div className="timer">
      {/* Mode switch */}
      <div className="seg-tabs" role="tablist" aria-label="Timer mode">
        <button
          role="tab"
          aria-selected={mode === "hold"}
          className={`seg-tab ${mode === "hold" ? "active" : ""}`}
          onClick={() => { setMode("hold"); reset("hold"); }}
        >
          Hold
        </button>
        <button
          role="tab"
          aria-selected={mode === "pailsrails"}
          className={`seg-tab ${mode === "pailsrails" ? "active" : ""}`}
          onClick={() => { setMode("pailsrails"); reset("pailsrails"); }}
        >
          PAILs · RAILs
        </button>
      </div>

      {/* Settings row (presets for Hold, cycles for PAILs/RAILs) */}
      {mode === "hold" ? (
        <div className="timer-presets">
          {[30, 45, 60, 90].map((s) => (
            <button
              key={s}
              className={`chip ${holdSeconds === s ? "active" : ""}`}
              onClick={() => { setHoldSeconds(s); reset("hold", s); }}
            >
              {s}s
            </button>
          ))}
        </div>
      ) : (
        <div className="timer-presets">
          <span className="small muted">Cycles:</span>
          {[1, 2].map((r) => (
            <button
              key={r}
              className={`chip ${rounds === r ? "active" : ""}`}
              onClick={() => { setRounds(r); reset("pailsrails", holdSeconds, r); }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* The big display */}
      <div className={`timer-display tone-${current.tone} ${state.finished ? "finished" : ""}`}>
        <div className="timer-phase">{state.finished ? "Done ✓" : current.label}</div>
        <div className="timer-count">{fmt(state.secondsLeft)}</div>
        {mode === "pailsrails" && !state.finished && (
          <div className="timer-steps small">
            {state.phases.map((p, i) => (
              <span key={i} className={i === state.phaseIndex ? "step-on" : "step-off"}>
                {p.label.split(" ")[0]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button className="primary" onClick={toggleRun}>
          {state.running ? "Pause" : state.finished ? "Restart" : "Start"}
        </button>
        <button className="checkbtn" onClick={() => reset()} disabled={state.running}>
          Reset
        </button>
      </div>
      <p className="small muted" style={{ margin: "8px 0 0", textAlign: "center" }}>
        Beeps at each change. Earn depth - don't force it.
      </p>
    </div>
  );
}
