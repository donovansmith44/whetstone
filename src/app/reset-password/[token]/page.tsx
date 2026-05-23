import { AuthShell } from "@/components/auth/auth-shell";
import { ResetConfirmForm } from "@/components/auth/reset-confirm-form";

export default async function ResetConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthShell
      eyebrow="Set a New Password"
      title="Choose a"
      italic="new key"
      intro="Pick a fresh password — at least twelve characters. You'll be signed in afterward."
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
        New password
      </h2>
      <ResetConfirmForm token={token} />
    </AuthShell>
  );
}
