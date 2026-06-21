// notify.ts — emails the coach when a user sends a new message.
//
// Sends via the GMAIL API over HTTPS (not SMTP, which Render blocks). It uses an
// OAuth2 refresh token for your Gmail account, so alerts arrive FROM your own
// address. Two HTTPS calls: refresh-token -> short-lived access token, then
// gmail.users.messages.send. Best-effort: logs + returns the error on failure.
import "./env.js";

const GMAIL_USER = process.env.GMAIL_USER ?? ""; // your Gmail (sender + default recipient)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? "";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || GMAIL_USER;
const NOTIFY_FROM = process.env.NOTIFY_FROM || `UNSTUCK <${GMAIL_USER}>`;
const APP_URL = process.env.APP_URL ?? "https://unstuck-app.onrender.com";

// Configured only when we have everything needed to mint an access token + send.
export const notifyConfigured = Boolean(
  GMAIL_USER && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN,
);

export interface NotifyResult {
  sent: boolean;
  configured: boolean;
  error?: string; // failure reason, for diagnostics
}

// Access tokens last ~1h; cache and reuse until shortly before expiry.
let cached: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`token ${res.status}: ${data.error_description || data.error || "no access_token"}`);
  }
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

// Build an RFC-822 message and base64url-encode it (what the Gmail API expects).
function buildRaw(to: string, from: string, subject: string, text: string): string {
  const msg = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text,
  ].join("\r\n");
  return Buffer.from(msg, "utf8").toString("base64url");
}

export async function notifyNewMessage(body: string): Promise<NotifyResult> {
  if (!notifyConfigured) return { sent: false, configured: false };
  const preview = body.length > 600 ? body.slice(0, 600) + "…" : body;
  const text = `A user sent you a message:\n\n"${preview}"\n\nRead and reply in your inbox:\n${APP_URL}/inbox`;
  try {
    const accessToken = await getAccessToken();
    const raw = buildRaw(NOTIFY_EMAIL, NOTIFY_FROM, "New UNSTUCK message", text);
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const error = `gmail ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
      console.error("[notify] email error:", error);
      return { sent: false, configured: true, error };
    }
    return { sent: true, configured: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[notify] email error:", error);
    return { sent: false, configured: true, error };
  }
}
