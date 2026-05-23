import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Begin a Practice"
      title="A small"
      italic="ritual"
      intro="Two trusted friends, one quiet daily check-in. Start by making yourself an account — your friend joins next, through your invite."
      scripture="Behold, how good and how pleasant it is for brethren to dwell together in unity."
      scriptureCite="Psalm 133:1"
      footer={
        <span>
          Already keeping a practice?{" "}
          <Link
            href="/signin"
            style={{
              color: "var(--color-clay)",
              borderBottom: "1px solid var(--color-clay-soft)",
            }}
          >
            Sign in
          </Link>
          .
        </span>
      }
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
        New account
      </h2>
      <SignupForm />
    </AuthShell>
  );
}
