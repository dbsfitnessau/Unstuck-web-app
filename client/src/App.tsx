import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { TierProvider } from "./state/TierContext";
import BottomNav from "./components/BottomNav";
import CoachPanel from "./components/CoachPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Program from "./pages/Program";
import QuickCards from "./pages/QuickCards";
import Testing from "./pages/Testing";
import Search from "./pages/Search";

// App is the top-level shell:
//  - <TierProvider> shares the 🟢/🟡/🔴 choice with every screen.
//  - <Routes> is the "switchboard": it shows ONE page depending on the URL.
//  - BottomNav + CoachPanel are always on screen, regardless of route.
//
// The coach's open/closed state lives HERE (not inside CoachPanel) because two
// different things can open it: the Coach tab in the nav, and the Coach tile on
// Home. The tile is far away in the component tree, so it fires a tiny browser
// event ("unstuck:coach") that we listen for - same pattern the access gate
// already uses for "unstuck:locked".
export default function App() {
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    const open = () => setCoachOpen(true);
    window.addEventListener("unstuck:coach", open);
    return () => window.removeEventListener("unstuck:coach", open);
  }, []);

  return (
    <TierProvider>
      <div className="app-shell">
        <header className="topbar">
          <h1>UNSTUCK<span className="accent-dot">.</span></h1>
          <span className="avatar" aria-hidden="true">💪</span>
        </header>
        <div className="app-content">
          {/* If a page throws while rendering, the boundary shows a recovery
              screen instead of a blank page — and the nav below stays usable. */}
          <ErrorBoundary>
            <Routes>
              {/* Default: send "/" to Home */}
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/program" element={<Program />} />
              <Route path="/worksheet" element={<QuickCards />} />
              <Route path="/testing" element={<Testing />} />
              <Route path="/search" element={<Search />} />
              {/* Anything unknown falls back to Home */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>

        <CoachPanel open={coachOpen} onClose={() => setCoachOpen(false)} />
        <BottomNav coachOpen={coachOpen} onCoach={() => setCoachOpen(true)} />
      </div>
    </TierProvider>
  );
}
