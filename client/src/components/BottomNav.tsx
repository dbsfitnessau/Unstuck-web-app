import { NavLink } from "react-router-dom";

// The fixed bottom tab bar. <NavLink> is like a normal link but it automatically
// gets an "active" class when its route is the current page - that's how the
// active tab lights up in the accent colour.
const tabs = [
  { to: "/home", icon: "🏠", label: "Home" },
  { to: "/program", icon: "🗓", label: "Program" },
  { to: "/worksheet", icon: "✅", label: "Worksheet" },
  { to: "/testing", icon: "📐", label: "Testing" },
  { to: "/search", icon: "🔍", label: "Search" },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="icon">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
