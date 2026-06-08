// gumroad.ts — verify a Gumroad license key.
//
// When a buyer enters their license key, we ask Gumroad's API whether it's a real,
// still-valid purchase of OUR product. Gumroad also keeps a "uses" counter per key and
// bumps it each time we verify with increment_uses_count=true — we use that as an
// "activations" count to cap how many devices a single purchase can unlock (basic
// anti-sharing). We only verify on login/activation (not per request — see auth.ts), so
// the counter tracks devices, not page loads.
//
// Setup (you, in Gumroad):
//   1. Create the product, tick "Generate a unique license key per sale".
//   2. Put the product's ID in GUMROAD_PRODUCT_ID (env). Then this turns on automatically.

const PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID ?? "";
export const gumroadConfigured = PRODUCT_ID.length > 0;

// Max devices/activations per purchase. Generous enough for reinstalls; low enough to stop
// "I bought it and shared the key with ten friends".
export const MAX_ACTIVATIONS = Number(process.env.MAX_ACTIVATIONS) || 4;

export interface LicenseResult {
  valid: boolean;       // a real, non-refunded purchase of this product
  uses: number;         // how many activations so far
  overLimit?: boolean;  // valid, but past the device cap
  email?: string;       // purchaser's email (for support/records)
  reason?: string;      // why invalid, for logging
}

export async function verifyLicense(licenseKey: string): Promise<LicenseResult> {
  if (!gumroadConfigured) return { valid: false, uses: 0, reason: "not_configured" };

  const params = new URLSearchParams({
    product_id: PRODUCT_ID,
    license_key: licenseKey,
    increment_uses_count: "true", // counts this as one activation
  });

  const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    uses?: number;
    purchase?: { email?: string; refunded?: boolean; chargebacked?: boolean; disputed?: boolean };
  };

  if (!data.success) return { valid: false, uses: 0, reason: "invalid_key" };

  const p = data.purchase ?? {};
  if (p.refunded || p.chargebacked || p.disputed) {
    return { valid: false, uses: data.uses ?? 0, email: p.email, reason: "refunded_or_disputed" };
  }

  const uses = data.uses ?? 0;
  if (uses > MAX_ACTIVATIONS) {
    return { valid: true, uses, overLimit: true, email: p.email, reason: "device_limit" };
  }
  return { valid: true, uses, email: p.email };
}
