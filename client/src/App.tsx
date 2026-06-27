import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { TierProvider } from "./state/TierContext";
import BottomNav from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";

// Code-split the screens and the Coach so the initial download stays small:
// each page's code is fetched on first visit, and the Coach — which bundles the
// fairly heavy react-markdown — only when it's first opened. Behaviour is
// identical; React just loads each chunk on demand.
const Home = lazy(() => import("./pages/Home"));
const Program = lazy(() => import("./pages/Program"));
const QuickCards = lazy(() => import("./pages/QuickCards"));
const Testing = lazy(() => import("./pages/Testing"));
const Search = lazy(() => import("./pages/Search"));
const Legal = lazy(() => import("./pages/Legal"));
const YourData = lazy(() => import("./pages/YourData"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminInbox = lazy(() => import("./pages/AdminInbox")); // coach-only message inbox
// The message coach (human-answered, no AI/API cost). To switch back to the AI
// coach, point this import at "./components/CoachPanel" instead — same props.
const CoachPanel = lazy(() => import("./components/MessageCoachPanel"));

// App is the top-level shell:
//  - <TierProvider> shares the 🟢/🟡/🔴 choice with every screen.
//  - <Routes> is the "switchboard": it shows ONE page depending on the URL.
//  - BottomNav is always on screen; the Coach mounts on first open.
//
// The coach's open/closed state lives HERE (not inside CoachPanel) because two
// different things can open it: the Coach tab in the nav, and the Coach tile on
// Home. The tile is far away in the component tree, so it fires a tiny browser
// event ("unstuck:coach") that we listen for - same pattern the access gate
// already uses for "unstuck:locked".
export default function App() {
  const [coachOpen, setCoachOpen] = useState(false);
  // The Coach is only mounted once it's first opened (its chunk loads then) and
  // stays mounted afterwards, so its chat history and close animation persist.
  const [coachReady, setCoachReady] = useState(false);
  const openCoach = () => {
    setCoachReady(true);
    setCoachOpen(true);
  };

  useEffect(() => {
    const open = () => {
      setCoachReady(true);
      setCoachOpen(true);
    };
    window.addEventListener("unstuck:coach", open);
    return () => window.removeEventListener("unstuck:coach", open);
  }, []);

  return (
    <TierProvider>
      <div className="app-shell">
        <header className="topbar">
          <Link to="/home" className="topbar-home" aria-label="Home">
            <h1>UNSTUCK<span className="accent-dot">.</span></h1>
          </Link>
          <Link to="/profile" className="avatar" aria-label="Open profile">U</Link>
        </header>
        <div className="app-content">
          {/* If a page throws while rendering, the boundary shows a recovery
              screen instead of a blank page — and the nav below stays usable.
              Suspense shows a light placeholder while a page's chunk loads. */}
          <ErrorBoundary>
            <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
              <Routes>
                {/* Default: send "/" to Home */}
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/program" element={<Program />} />
                <Route path="/worksheet" element={<QuickCards />} />
                <Route path="/testing" element={<Testing />} />
                <Route path="/search" element={<Search />} />
                {/* Legal / policy pages: hub + individual docs + data controls. */}
                <Route path="/legal" element={<Legal />} />
                <Route path="/legal/:slug" element={<Legal />} />
                <Route path="/your-data" element={<YourData />} />
                <Route path="/profile" element={<Profile />} />
                {/* Coach-only message inbox (access enforced server-side by RLS). */}
                <Route path="/inbox" element={<AdminInbox />} />
                {/* Anything unknown falls back to Home */}
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          {/* Footer scrolls at the bottom of every page, under the content. */}
          <Footer />
        </div>

        {/* One-time, honest cookie/storage notice. */}
        <CookieConsent />

        {coachReady && (
          <Suspense fallback={null}>
            <CoachPanel open={coachOpen} onClose={() => setCoachOpen(false)} />
          </Suspense>
        )}
        <BottomNav coachOpen={coachOpen} onCoach={openCoach} />
      </div>
    </TierProvider>
  );
}
