import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export default function ResetRequestPage() {
  return (
    <AuthShell
      eyebrow="Reset Your Password"
      title="A new"
      italic="key"
      intro="Tell us the email tied to your account. We'll send a one-time link you can use to set a new password."
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px",
          fontWeight: 500,
          marginBottom: "20px",
          color: "var(--color-ink)",
          fontVariationSettings: '"opsz" 24, "SOFT" 30',
        }}
      >
        Request reset link
      </h2>
      <ResetRequestForm />
      <div
        className="mt-7 pt-5 border-t"
        style={{
          borderColor: "var(--color-rule)",
          fontFamily: "var(--font-display)",
          fontSize: "13.5px",
          fontStyle: "italic",
          color: "var(--color-ink-soft)",
        }}
      >
        <Link
          href="/signin"
          style={{ color: "var(--color-clay)", borderBottom: "1px solid var(--color-clay-soft)" }}
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
