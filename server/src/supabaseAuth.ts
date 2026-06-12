// supabaseAuth.ts — verifies "this request comes from a signed-in user".
//
// When a user signs in with a magic link, Supabase gives their browser a
// session token (a JWT). The client sends it in x-access-token. To check it's
// genuine we ask Supabase's own auth API: GET /auth/v1/user with that token —
// if Supabase recognises it, it returns the user; if not, 401.
//
// That's one network hop per check, so we keep a small in-memory cache:
// a token verified in the last 5 minutes is trusted without re-asking.
// (Tokens expire hourly on their own, so the cache can't outlive a session
// for long, and a signed-out token dies at most 5 minutes late.)
//
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment; without
// them this verifier simply says "no" and the legacy code paths still apply.
// Normalise SUPABASE_URL down to its origin ("https://xxxx.supabase.co").
// People copy this value with stray paths attached (".../rest/v1/") — keeping
// only the origin makes both forms work.
const SUPABASE_URL = (() => {
  const raw = (process.env.SUPABASE_URL ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    console.warn("[supabaseAuth] SUPABASE_URL is not a valid URL:", raw);
    return "";
  }
})();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, number>(); // token -> trusted-until (ms epoch)

export async function verifySupabaseToken(token: string): Promise<boolean> {
  if (!supabaseConfigured) return false;
  // Supabase JWTs have three dot-separated parts; cheap pre-filter so we
  // don't make a network call for beta codes or legacy tokens.
  if (token.split(".").length !== 3) return false;

  const trustedUntil = cache.get(token);
  if (trustedUntil && trustedUntil > Date.now()) return true;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    if (cache.size > 2000) cache.clear(); // crude but sufficient bound
    cache.set(token, Date.now() + CACHE_TTL_MS);
    return true;
  } catch (err) {
    console.error("[supabaseAuth] verify failed:", err);
    return false;
  }
}
