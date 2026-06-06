import { TIERS } from "../data/dummyContent";
import { useTier } from "../state/TierContext";

// The 🟢/🟡/🔴 switch. It reads + writes the shared tier from context, so
// wherever it appears it stays in sync. Note: we always show emoji + label,
// never colour alone - that's an accessibility rule (don't rely on colour).
export default function TierToggle() {
  const { tier, setTier } = useTier();
  return (
    <div className="tier-toggle" role="group" aria-label="Select difficulty tier">
      {TIERS.map((t) => (
        <button
          key={t.id}
          className={tier === t.id ? "active" : ""}
          onClick={() => setTier(t.id)}
          aria-pressed={tier === t.id}
          title={t.label}
        >
          {t.emoji} {t.label}
        </button>
      ))}
    </div>
  );
}
