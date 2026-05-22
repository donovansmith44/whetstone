import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY not set — emails will fail to send");
}

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM = process.env.RESEND_FROM_EMAIL ?? "Whetstone <onboarding@resend.dev>";
const APP_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${APP_URL}/verify-email/${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Confirm your Whetstone email",
    html: `
      <p>Welcome to Whetstone.</p>
      <p>Click below to confirm your email address:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${APP_URL}/reset-password/${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Whetstone password",
    html: `
      <p>You requested a password reset.</p>
      <p>Click below to choose a new password:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore the email.</p>
    `,
  });
}
