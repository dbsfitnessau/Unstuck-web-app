import { useState, useEffect } from "react";

// A reusable hook: behaves like useState, but also saves the value to the
// browser's localStorage under `key`, and reloads it on next visit.
// localStorage only stores strings, so we JSON.stringify on the way out and
// JSON.parse on the way back in.
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
