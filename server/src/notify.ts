// notify.ts — emails the coach when a user sends a new message.
//
// Sends through your OWN Gmail over SMTP, using an "App Password" (a 16-char
// password Google generates just for this server — not your real password).
// So alerts arrive FROM your own address, with no third-party email service.
// It's best-effort: if email isn't configured or a send fails, we just log it;
// the message is always safe in the inbox regardless.
import "./env.js";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER ?? ""; // e.g. dbsfitnessaustralia@gmail.com
// Google shows the App Password as 4 groups of 4 with spaces ("abcd efgh ..."),
// but SMTP wants it with no spaces — strip them so a copy-paste just works.
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || GMAIL_USER; // default: email yourself
const NOTIFY_FROM = process.env.NOTIFY_FROM || `UNSTUCK <${GMAIL_USER}>`;
const APP_URL = process.env.APP_URL ?? "https://unstuck-app.onrender.com";

// True only when both Gmail credentials are present.
export const notifyConfigured = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

// Build the SMTP connection once, lazily, and reuse it.
let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail", // shortcut for smtp.gmail.com over TLS
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export interface NotifyResult {
  sent: boolean;
  configured: boolean;
  error?: string; // the SMTP error message, if the send failed (for diagnostics)
}

export async function notifyNewMessage(body: string): Promise<NotifyResult> {
  if (!notifyConfigured) return { sent: false, configured: false };
  const preview = body.length > 600 ? body.slice(0, 600) + "…" : body;
  try {
    await getTransporter().sendMail({
      from: NOTIFY_FROM,
      to: NOTIFY_EMAIL,
      subject: "New UNSTUCK message",
      text: `A user sent you a message:\n\n"${preview}"\n\nRead and reply in your inbox:\n${APP_URL}/inbox`,
    });
    return { sent: true, configured: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[notify] email error:", error);
    return { sent: false, configured: true, error };
  }
}
