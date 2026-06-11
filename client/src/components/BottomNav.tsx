import { NavLink } from "react-router-dom";

// The floating bottom tab bar. <NavLink> is like a normal link but it
// automatically gets an "active" class when its route is the current page -
// that's how the active tab lights up olive.
//
// Coach is the odd one out: it isn't a page with a URL, it's the chat sheet
// that slides over whatever you're doing. So it renders as a <button> that
// tells App to open the panel, and we light it up while the panel is open.
const tabs = [
  { to: "/home", icon: "🏠", label: "Home" },
  { to: "/program", icon: "🗓", label: "Program" },
  { to: "/worksheet", icon: "✅", label: "Worksheet" },
  { to: "/testing", icon: "📐", label: "Assessment" },
  { to: "/search", icon: "🔍", label: "Search" },
];

export default function BottomNav({
  coachOpen,
  onCoach,
}: {
  coachOpen: boolean;
  onCoach: () => void;
}) {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
      <button type="button" className={coachOpen ? "active" : ""} onClick={onCoach}>
        <span className="icon">💬</span>
        Coach
      </button>
    </nav>
  );
}
