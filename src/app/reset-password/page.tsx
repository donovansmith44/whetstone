import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export default function ResetRequestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-gray-600 mt-1">
            Enter your account email and we'll send you a reset link.
          </p>
        </div>
        <ResetRequestForm />
        <p className="text-sm text-gray-600">
          <Link href="/signin" className="underline">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
