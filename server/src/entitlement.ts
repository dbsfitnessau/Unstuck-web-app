// entitlement.ts — read and grant a user's access level ("entitlement").
//
// A profile's `entitlement` is the content gate: 'none' (signed up but hasn't
// paid), 'beta', or 'paid'. Users can NEVER change their own entitlement — the
// database's row-level-security forbids it. Only this module can, because it
// uses the SERVICE-ROLE key (the admin key that lives only on the server and
// bypasses those rules by design). That's what makes "paid" trustworthy.
//
// The one write we do — redeemForUser — also BINDS the Gumroad license key to
// this one account, so the same key can't unlock a second account. The unique
// index in supabase-schema.sql is the race-proof backstop for that promise.
//
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same two the auth verifier and
// account-deletion use). Without them this module reports "not configured".

const SUPABASE_URL = (() => {
  const raw = (process.env.SUPABASE_URL ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const entitlementConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export type Entitlement = "none" | "beta" | "paid";

// What a redeem attempt can result in. The server turns each into a clear
// message for the buyer (see /api/redeem).
export type RedeemOutcome = "ok" | "already-other" | "not-configured" | "error";

// Read one user's entitlement. Used by the coach gate so a signed-in but
// unpaid account can't use paid server features. Returns 'none' on any error
// (fail closed — an error should never accidentally grant access).
export async function getEntitlement(userId: string): Promise<Entitlement> {
  if (!entitlementConfigured) return "none";
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=entitlement`,
      { headers: adminHeaders },
    );
    if (!res.ok) return "none";
    const rows = (await res.json()) as { entitlement?: Entitlement }[];
    return rows[0]?.entitlement ?? "none";
  } catch (err) {
    console.error("[entitlement] getEntitlement failed:", err);
    return "none";
  }
}

// Mark an email as a paid buyer (called by the Gumroad ping webhook). Two writes:
//   1. Remember the email in entitled_emails, so if they haven't signed in yet,
//      the signup trigger unlocks them the moment they do.
//   2. If they ALREADY have an account, flip that profile to 'paid' now.
// Idempotent: repeated pings for the same email are harmless.
export async function grantByEmail(email: string): Promise<RedeemOutcome> {
  if (!entitlementConfigured) return "not-configured";
  const clean = email.trim().toLowerCase();
  if (!clean) return "error";

  try {
    // 1. Upsert into entitled_emails (merge-duplicates = insert or ignore).
    await fetch(`${SUPABASE_URL}/rest/v1/entitled_emails`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ email: clean, source: "gumroad" }),
    });

    // 2. Unlock an existing profile with this email (case-insensitive match).
    await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=ilike.${encodeURIComponent(clean)}`,
      {
        method: "PATCH",
        headers: { ...adminHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          entitlement: "paid",
          entitlement_source: "gumroad",
          updated_at: new Date().toISOString(),
        }),
      },
    );
    return "ok";
  } catch (err) {
    console.error("[entitlement] grantByEmail failed:", err);
    return "error";
  }
}

// Reverse of grantByEmail — called when Gumroad reports a refund/chargeback.
// Forgets the paid email and locks any existing account back to 'none'.
export async function revokeByEmail(email: string): Promise<RedeemOutcome> {
  if (!entitlementConfigured) return "not-configured";
  const clean = email.trim().toLowerCase();
  if (!clean) return "error";

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/entitled_emails?email=eq.${encodeURIComponent(clean)}`, {
      method: "DELETE",
      headers: { ...adminHeaders, Prefer: "return=minimal" },
    });
    await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=ilike.${encodeURIComponent(clean)}`,
      {
        method: "PATCH",
        headers: { ...adminHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          entitlement: "none",
          entitlement_source: null,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    return "ok";
  } catch (err) {
    console.error("[entitlement] revokeByEmail failed:", err);
    return "error";
  }
}

// Bind a verified Gumroad license to THIS account and mark it paid.
//
// Order matters:
//   1. Look up who (if anyone) already owns this key.
//        - already this same user → 'ok' (they re-entered it; harmless).
//        - a DIFFERENT user       → 'already-other' (refuse — this is the
//          anti-sharing rule: a shared key can't onboard a second account).
//   2. Otherwise stamp it onto this user's profile. If two people race the same
//      key, the unique index makes the loser's write fail → we return
//      'already-other' rather than pretend it worked.
//
// The caller (/api/redeem) is responsible for having verified the key with
// Gumroad FIRST — this function trusts that and only handles the binding.
export async function redeemForUser(
  userId: string,
  email: string | null,
  licenseKey: string,
): Promise<RedeemOutcome> {
  if (!entitlementConfigured) return "not-configured";

  try {
    // 1. Is this key already claimed?
    const ownerRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?redeemed_code=eq.${encodeURIComponent(licenseKey)}&select=id`,
      { headers: adminHeaders },
    );
    if (ownerRes.ok) {
      const owners = (await ownerRes.json()) as { id?: string }[];
      const owner = owners[0]?.id;
      if (owner && owner === userId) return "ok"; // same account re-redeeming
      if (owner && owner !== userId) return "already-other"; // claimed elsewhere
    }

    // 2. Stamp this account as paid and bind the key. `Prefer: return=minimal`
    //    keeps the response small; a unique-violation surfaces as HTTP 409.
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: { ...adminHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          entitlement: "paid",
          entitlement_source: "gumroad",
          redeemed_code: licenseKey,
          email, // keep the profile email fresh for your records
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (patchRes.status === 409) return "already-other"; // lost the unique-index race
    if (!patchRes.ok) {
      console.error("[entitlement] redeem PATCH failed:", patchRes.status, await patchRes.text().catch(() => ""));
      return "error";
    }
    return "ok";
  } catch (err) {
    console.error("[entitlement] redeemForUser failed:", err);
    return "error";
  }
}
