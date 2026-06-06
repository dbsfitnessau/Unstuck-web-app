import { createContext, useContext, useState, type ReactNode } from "react";
import type { Tier } from "../data/dummyContent";

// "Context" is React's way of sharing one piece of state across many screens
// WITHOUT passing it down by hand through every component. We store the user's
// chosen tier here once; Program and Quick Cards both read it.
interface TierState {
  tier: Tier;
  setTier: (t: Tier) => void;
}

const TierContext = createContext<TierState | undefined>(undefined);

export function TierProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<Tier>("green"); // start at the safe default
  return <TierContext.Provider value={{ tier, setTier }}>{children}</TierContext.Provider>;
}

// A small helper hook so screens can just call useTier() to read/change it.
export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error("useTier must be used inside <TierProvider>");
  return ctx;
}
