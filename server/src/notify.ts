// notify.ts — emails the coach when a user sends a new message.
//
// Kept tiny and dependency-free: it POSTs to Resend's HTTP API (free tier is
// plenty for this). It's best-effort — if email isn't configured or the send
// fails, we just log it; the message is still safe in the inbox either way.
import "./env.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL ?? ""; // where alerts are sent (your DBS inbox)
const NOTIFY_FROM = process.env.NOTIFY_FROM ?? "UNSTUCK <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? "https://unstuck-app.onrender.com";

// True only when both the API key and a destination address are set.
export const notifyConfigured = Boolean(RESEND_API_KEY && NOTIFY_EMAIL);

export async function notifyNewMessage(body: string): Promise<boolean> {
  if (!notifyConfigured) return false;
  const preview = body.length > 600 ? body.slice(0, 600) + "…" : body;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_EMAIL,
        subject: "New UNSTUCK message",
        text: `A user sent you a message:\n\n"${preview}"\n\nRead and reply in your inbox:\n${APP_URL}/inbox`,
      }),
    });
    if (!res.ok) {
      console.warn("[notify] email send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] email error:", err);
    return false;
  }
}
