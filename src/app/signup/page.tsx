import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Create your Whetstone account</h1>
          <p className="text-sm text-gray-600 mt-1">Daily check-ins, shared with your group.</p>
        </div>
        <SignupForm />
        <p className="text-sm text-gray-600">
          Already have an account? <Link href="/signin" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
