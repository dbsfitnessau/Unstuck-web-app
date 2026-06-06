import { Component, type ReactNode } from "react";

// A React "error boundary" — a safety net. If any page below it throws while
// rendering, React calls this instead of unmounting the whole app (which would
// leave a blank white screen). Error boundaries MUST be class components; this
// is the one place in the app we use a class instead of a function.
//
// The recovery button clears the app's saved data, because the most likely cause
// of a render crash is stale/legacy data in localStorage from an older version.
interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  // Called when a child throws during render — we store the error so the next
  // render shows the fallback UI instead of crashing the whole tree.
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface it in the console for debugging (not shown to the user).
    console.error("[ErrorBoundary] caught:", error);
  }

  handleReset = () => {
    try {
      // Clear only this app's keys, then reload to a clean slate.
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.assign("/home");
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong on this screen.</h2>
          <p className="small muted">
            This is usually caused by old saved data from an earlier version of the app.
            Resetting clears your locally-saved progress (ticks, test results, chat) and
            reloads a clean version.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button className="primary" onClick={this.handleReset}>Reset saved data &amp; reload</button>
            <button className="checkbtn" onClick={() => window.location.reload()}>Just reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
