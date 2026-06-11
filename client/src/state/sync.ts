// Cloud progress sync.
//
// The app keeps working exactly as before — every change is saved to the
// browser's localStorage instantly (fast, works offline). This module adds a
// second copy in Supabase, keyed to the signed-in user:
//
//   sign-in  → pullAll(): cloud data overwrites local (the cloud is the
//              cross-device source of truth). Any key that exists locally
//              but NOT in the cloud is pushed up instead — that's the
//              one-time migration that rescues progress made before
//              accounts existed.
//   any edit → schedulePush(): waits 1.2s for typing/ticking to settle
//              (a "debounce"), then upserts the row. One row per user per
//              storage key — same shape as localStorage, easy to reason
//              about.
//
// After every worksheet push we also maintain a tiny 'summary' row
// ({ daysDone }) so Lea's user_overview report can show how far each user
// is without recomputing the worksheet logic in SQL.
import { supabase } from "./supabase";
import { daysDone } from "../data/schedule";

// The keys that sync. Coach chat history stays device-local on purpose.
export const SYNC_KEYS = [
  "unstuck:worksheet-log",
  "unstuck:test-results",
  "unstuck:test-milestones",
] as const;

// Fired after a pull so any mounted screens re-read localStorage.
export const SYNC_EVENT = "unstuck:synced";

export async function pullAll(): Promise<void> {
  if (!supabase) return;
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) return;

  const { data, error } = await supabase
    .from("progress")
    .select("key,data")
    .eq("user_id", userId);
  if (error) {
    console.warn("[sync] pull failed:", error.message);
    return;
  }

  const cloudKeys = new Set<string>();
  for (const row of data ?? []) {
    cloudKeys.add(row.key);
    if ((SYNC_KEYS as readonly string[]).includes(row.key)) {
      localStorage.setItem(row.key, JSON.stringify(row.data));
    }
  }

  // Migration: local progress that the cloud has never seen goes up now.
  for (const key of SYNC_KEYS) {
    if (cloudKeys.has(key)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      await pushNow(key, JSON.parse(raw));
    } catch {
      /* unparseable local data — skip it */
    }
  }

  window.dispatchEvent(new Event(SYNC_EVENT));
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function schedulePush(key: string, value: unknown): void {
  if (!supabase) return;
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void pushNow(key, value);
    }, 1200),
  );
}

async function pushNow(key: string, value: unknown): Promise<void> {
  if (!supabase) return;
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) return; // not signed in — local-only mode, nothing to do

  const rows: { user_id: string; key: string; data: unknown; updated_at: string }[] = [
    { user_id: userId, key, data: value, updated_at: new Date().toISOString() },
  ];
  // Keep the days-done summary fresh whenever the worksheet changes.
  if (key === "unstuck:worksheet-log") {
    rows.push({
      user_id: userId,
      key: "summary",
      data: { daysDone: daysDone() },
      updated_at: new Date().toISOString(),
    });
  }

  const { error } = await supabase.from("progress").upsert(rows);
  if (error) console.warn("[sync] push failed:", error.message);
}
