// useSyncedStorage — a drop-in replacement for useLocalStorage that ALSO
// keeps the value in the user's cloud progress (see sync.ts).
//
// Behaviour:
//   - reads/writes localStorage exactly like useLocalStorage (instant, offline-safe)
//   - every change additionally schedules a debounced push to Supabase
//   - when sync.ts pulls cloud data down (on sign-in), the SYNC_EVENT makes
//     this hook re-read localStorage so the screen updates in place
import { useEffect, useState } from "react";
import { schedulePush, SYNC_EVENT } from "./sync";

function read<T>(key: string, initial: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : initial;
  } catch {
    return initial;
  }
}

export function useSyncedStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));

  // Local save + cloud push on every change.
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
    schedulePush(key, value);
  }, [key, value]);

  // Cloud pulled fresh data down → re-read it.
  useEffect(() => {
    const onSync = () => setValue(read(key, initial));
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue] as const;
}
