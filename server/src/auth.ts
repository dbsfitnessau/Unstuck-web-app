// auth.ts — tiny stateless session tokens (no database needed).
//
// After we've confirmed someone is allowed in (valid beta code, or a verified Gumroad
// license), we hand the browser a SIGNED token instead of making it re-verify on every
// request. The token is just: base64(payload) + "." + HMAC(payload, SESSION_SECRET).
// Because it's signed with a secret only the server knows, the browser can't forge or
// tamper with it, and we can validate it locally (fast, no Gumroad call, no DB).

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

// The signing secret. MUST be set in production (and kept stable) so tokens survive
// server restarts/redeploys — otherwise everyone gets logged out on each deploy. Locally
// we fall back to a random per-boot secret and warn.
const SECRET =
  process.env.SESSION_SECRET ||
  (() => {
    console.warn(
      "[auth] SESSION_SECRET is not set — using a temporary random secret. " +
        "Set SESSION_SECRET in production so logins survive restarts.",
    );
    return randomBytes(32).toString("hex");
  })();

// How long a login lasts before the browser must re-verify (re-entering the key, which
// costs one Gumroad activation). 180 days keeps re-verifies rare.
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export function signToken(payload: Record<string, unknown>): string {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [data, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // Constant-time compare so we don't leak signature info via timing.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const body = JSON.parse(Buffer.from(data, "base64url").toString()) as { exp?: number };
    return typeof body.exp === "number" && body.exp > Date.now();
  } catch {
    return false;
  }
}
