// coachMessages.ts — the human-answered message thread (NO AI, NO API tokens).
//
// Each signed-in user has one thread in the `coach_messages` table. They send
// messages tagged 'user'; the coach (an admin) replies with rows tagged 'coach'.
// Row-Level Security guarantees a user only ever reads/writes their OWN thread
// (see server/supabase-schema.sql). This module is the thin client wrapper —
// it talks straight to Supabase, so no Express server or Anthropic call is involved.
import { supabase } from "./supabase";

export interface CoachMessage {
  id: string;
  user_id: string;
  sender: "user" | "coach";
  body: string;
  created_at: string;
}

const COLUMNS = "id,user_id,sender,body,created_at";

// Load the signed-in user's whole thread, oldest message first.
export async function loadThread(): Promise<CoachMessage[]> {
  if (!supabase) return [];
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  // The .eq is belt-and-braces: RLS already limits a normal user to their own
  // rows, but it also keeps an admin's OWN panel showing only their own thread.
  const { data, error } = await supabase
    .from("coach_messages")
    .select(COLUMNS)
    .eq("user_id", uid)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[coach-messages] load failed:", error.message);
    return [];
  }
  return (data ?? []) as CoachMessage[];
}

// Send a message as the signed-in user. Returns the saved row, or null on failure.
export async function sendMessage(body: string): Promise<CoachMessage | null> {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("coach_messages")
    .insert({ user_id: uid, sender: "user", body })
    .select(COLUMNS)
    .single();
  if (error) {
    console.warn("[coach-messages] send failed:", error.message);
    return null;
  }
  return data as CoachMessage;
}

// ── Admin side (the coach's inbox) ──────────────────────────────────────────
// These only return data for an admin: the "admin reads all" / "admin sends
// replies" RLS policies (see supabase-schema.sql) gate them at the database, so
// a non-admin who calls these simply gets nothing back — the lock is server-side.

export interface Thread {
  userId: string;
  email: string | null;
  count: number;
  lastBody: string;
  lastAt: string;
  lastSender: "user" | "coach";
  unanswered: boolean; // the last message is from the user → awaiting your reply
}

// Is the signed-in user the coach/admin? Reads their own profile row.
export async function getIsAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", uid).single();
  return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
}

// Every user's thread, summarised (most recent activity first). Admin-only via RLS.
export async function loadAllThreads(): Promise<Thread[]> {
  if (!supabase) return [];
  const { data: msgs, error } = await supabase
    .from("coach_messages")
    .select("user_id,sender,body,created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[coach-messages] admin load failed:", error.message);
    return [];
  }
  type Row = { user_id: string; sender: "user" | "coach"; body: string; created_at: string };
  const rows = (msgs ?? []) as Row[];

  const byUser = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byUser.get(r.user_id) ?? [];
    arr.push(r);
    byUser.set(r.user_id, arr);
  }
  const userIds = [...byUser.keys()];

  // Map user ids → emails (admin can read all profiles via RLS).
  const emails = new Map<string, string | null>();
  if (userIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id,email").in("id", userIds);
    for (const p of (profs ?? []) as { id: string; email: string | null }[]) {
      emails.set(p.id, p.email);
    }
  }

  const threads: Thread[] = userIds.map((uid) => {
    const arr = byUser.get(uid)!;
    const last = arr[arr.length - 1];
    return {
      userId: uid,
      email: emails.get(uid) ?? null,
      count: arr.length,
      lastBody: last.body,
      lastAt: last.created_at,
      lastSender: last.sender,
      unanswered: last.sender === "user",
    };
  });
  threads.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  return threads;
}

// One user's full thread, for the admin to read. Admin-only via RLS.
export async function loadThreadFor(userId: string): Promise<CoachMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("coach_messages")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[coach-messages] admin thread load failed:", error.message);
    return [];
  }
  return (data ?? []) as CoachMessage[];
}

// Post a coach reply into a user's thread. Only an admin may insert sender='coach' (RLS).
export async function replyTo(userId: string, body: string): Promise<CoachMessage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("coach_messages")
    .insert({ user_id: userId, sender: "coach", body })
    .select(COLUMNS)
    .single();
  if (error) {
    console.warn("[coach-messages] reply failed:", error.message);
    return null;
  }
  return data as CoachMessage;
}
