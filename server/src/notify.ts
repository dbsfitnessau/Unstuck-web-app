// notify.ts — emails the coach when a user sends a new message.
//
// Sends via Resend's HTTPS API (port 443 — works on Render, where outbound SMTP
// is blocked). With no verified domain, Resend's free "onboarding@resend.dev"
// sender can email the address you signed up with — which is exactly the
// notify-yourself case here. Best-effort: logs + returns the error on failure.
import "./env.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL ?? ""; // where alerts go (your inbox)
const NOTIFY_FROM = process.env.NOTIFY_FROM ?? "UNSTUCK <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? "https://unstuck-app.onrender.com";

// Configured only when we have a key and a destination address.
export const notifyConfigured = Boolean(RESEND_API_KEY && NOTIFY_EMAIL);

export interface NotifyResult {
  sent: boolean;
  configured: boolean;
  error?: string; // failure reason, for diagnostics
}

export async function notifyNewMessage(body: string): Promise<NotifyResult> {
  if (!notifyConfigured) return { sent: false, configured: false };
  const preview = body.length > 600 ? body.slice(0, 600) + "…" : body;
  const text = `A user sent you a message:\n\n"${preview}"\n\nRead and reply in your inbox:\n${APP_URL}/inbox`;
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
        text,
      }),
    });
    if (!res.ok) {
      const error = `resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
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
