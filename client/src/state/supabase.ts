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

// Where the coach server lives (same value the access gate uses).
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

// A user's access level. 'none' = signed up but not activated (must redeem a
// license); 'beta'/'paid' = in. Only the SERVER can raise this — see the
// server's entitlement.ts — so it's safe to trust here for showing/hiding UI.
export type Entitlement = "none" | "beta" | "paid";

// Read THIS signed-in user's entitlement from their own profile row. Row-level
// security lets a user read only their own profile, so this is safe from the
// browser. Fails "closed" (returns 'none') so a hiccup never wrongly unlocks.
export async function getEntitlement(): Promise<Entitlement> {
  if (!supabase) return "none";
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return "none";
  const { data, error } = await supabase
    .from("profiles")
    .select("entitlement")
    .eq("id", uid)
    .single();
  if (error || !data) return "none";
  return (data.entitlement as Entitlement) ?? "none";
}

// Send a Gumroad license key to the server to activate this account. The server
// verifies it with Gumroad and binds it to the account; here we just report
// success or the server's human-readable message.
export async function redeemLicense(key: string): Promise<{ ok: boolean; message?: string }> {
  const token = await getCoachToken(); // the signed-in user's Supabase session token
  try {
    const res = await fetch(`${API_URL}/api/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-token": token },
      body: JSON.stringify({ code: key }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok === true, message: data.message };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Try again in a moment." };
  }
}
