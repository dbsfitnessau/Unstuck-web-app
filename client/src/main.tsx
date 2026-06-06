import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// This is the ignition switch. It finds the empty <div id="root"> in index.html
// and tells React to render our <App> inside it.
// <BrowserRouter> wraps the app so we can have multiple "pages" (URLs) without
// the browser ever doing a full page reload — that's what makes it feel like an app.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* future flags: opt in early to React Router v7 behaviour. This just
        silences the upgrade-warning noise in the console — no behaviour change. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
