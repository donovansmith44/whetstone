import { AuthShell } from "@/components/auth/auth-shell";

export default function VerifyEmailLandingPage() {
  return (
    <AuthShell
      eyebrow="Confirm Your Email"
      title="A letter"
      italic="awaits"
      intro="We've sent a one-time link to the address you gave us. Open it to finish setting up your account."
    >
      <div className="space-y-4">
        <div className="rule-ornament" style={{ margin: "0", textAlign: "left" }}>
          <span style={{ color: "var(--color-clay)" }}>✦</span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 500,
            color: "var(--color-ink)",
          }}
        >
          Check your inbox.
        </h3>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "15px",
            lineHeight: 1.6,
            color: "var(--color-ink-soft)",
          }}
        >
          The link lasts 24 hours. If you don't see it, peek at the spam folder
          — and if it never arrives, sign up again with the same email and
          we'll send a fresh one.
        </p>
      </div>
    </AuthShell>
  );
}
