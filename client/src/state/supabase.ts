// One shared Supabase client for the whole app.
//
// Supabase is our accounts + database service. This module reads the two
// PUBLIC config values (baked in at build time by Vite) and creates the
// client. The anon key is designed to ship in the browser: on its own it can
// only do what the database's row-level-security rules allow — which is
// "each signed-in user may touch only their own rows".
//
// If the env vars aren't set (e.g. an old local build), `supabase` is null
// and the app falls back to the legacy access-code gate — so nothing breaks
// mid-transition.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

// The token the coach server accepts as proof of "this is a signed-in user".
// Falls back to the legacy access-code token if there's no Supabase session.
export async function getCoachToken(): Promise<string> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  }
  try {
    return localStorage.getItem("unstuck-access") ?? "";
  } catch {
    return "";
  }
}
