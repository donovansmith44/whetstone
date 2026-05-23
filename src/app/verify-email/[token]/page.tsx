import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { verifyEmailToken } from "@/server-actions/auth";

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmailToken(token);

  if (result.ok) {
    return (
      <AuthShell
        eyebrow="Welcome to Whetstone"
        title="Email"
        italic="confirmed"
      >
        <div className="space-y-5">
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
            You're all set.
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
            Sign in to make your first template and your first check-in.
          </p>
          <Link href="/signin" className="btn-clay inline-block">
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Verification"
      title="Link"
      italic="expired"
    >
      <div className="space-y-5">
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "15px",
            lineHeight: 1.6,
            color: "var(--color-ink-soft)",
          }}
        >
          {result.error}
        </p>
        <Link href="/signup" className="btn-ghost inline-block">
          Sign up again
        </Link>
      </div>
    </AuthShell>
  );
}
