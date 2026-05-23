import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SigninForm } from "@/components/auth/signin-form";

export default function SigninPage() {
  return (
    <AuthShell
      eyebrow="Return to the Page"
      title="Welcome"
      italic="back"
      intro="The day is waiting for a few honest words. Sign in to pick up where you left off."
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px",
          fontWeight: 500,
          letterSpacing: "-0.005em",
          marginBottom: "20px",
          color: "var(--color-ink)",
          fontVariationSettings: '"opsz" 24, "SOFT" 30',
        }}
      >
        Sign in
      </h2>
      <SigninForm />
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
        New here?{" "}
        <Link
          href="/signup"
          style={{ color: "var(--color-clay)", borderBottom: "1px solid var(--color-clay-soft)" }}
        >
          Start a practice
        </Link>
        . Forgot your password?{" "}
        <Link
          href="/reset-password"
          style={{ color: "var(--color-clay)", borderBottom: "1px solid var(--color-clay-soft)" }}
        >
          Reset it
        </Link>
        .
      </div>
    </AuthShell>
  );
}
