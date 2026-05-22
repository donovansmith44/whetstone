import { ResetConfirmForm } from "@/components/auth/reset-confirm-form";

export default async function ResetConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <ResetConfirmForm token={token} />
      </div>
    </main>
  );
}
