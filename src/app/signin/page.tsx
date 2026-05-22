import Link from "next/link";
import { SigninForm } from "@/components/auth/signin-form";

export default function SigninPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Sign in to Whetstone</h1>
        </div>
        <SigninForm />
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            New here? <Link href="/signup" className="underline">Create an account</Link>
          </p>
          <p>
            {/* Will be converted back to <Link> once Task 12 (reset-password route) lands */}
            Forgot password? <a href="/reset-password" className="underline">Reset it</a>
          </p>
        </div>
      </div>
    </main>
  );
}
