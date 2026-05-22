import Link from "next/link";
import { verifyEmailToken } from "@/server-actions/auth";

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmailToken(token);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        {result.ok ? (
          <>
            <h1 className="text-2xl font-semibold">Email confirmed</h1>
            <p className="text-gray-600">You can now sign in.</p>
            <Link href="/signin" className="inline-block underline">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Link expired</h1>
            <p className="text-gray-600">{result.error}</p>
          </>
        )}
      </div>
    </main>
  );
}
