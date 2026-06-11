import { useState, type ReactNode } from "react";

// A collapsible section that ANIMATES open (the native <details> element can't).
// How the animation works: the body is a CSS grid whose row height goes from
// 0fr (closed) to 1fr (open). Browsers can transition between those two, which
// is the modern trick for animating "height: auto". The component only tracks
// one piece of state - open or not - and the CSS does the rest.
export default function Accordion({
  icon,
  title,
  tone,
  children,
}: {
  icon: string;
  title: string;
  tone?: "stop"; // safety sections get the red treatment
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`acc ${open ? "open" : ""}`}>
      <button className="acc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`acc-ico ${tone === "stop" ? "stop-ico" : ""}`} aria-hidden="true">{icon}</span>
        {title}
        <span className="chev" aria-hidden="true">▾</span>
      </button>
      <div className="acc-body">
        <div className="acc-inner">
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
