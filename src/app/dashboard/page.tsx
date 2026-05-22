import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <main className="min-h-screen p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        <p className="text-gray-600 mt-1">
          {session.user.emailVerifiedAt
            ? "Your email is verified."
            : "Please verify your email — check your inbox for the link we sent."}
        </p>
      </div>

      <div className="border rounded p-4 bg-gray-50">
        <p className="text-sm text-gray-700">
          Groups, templates, and daily entries will live here. (Plans 2–6.)
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </main>
  );
}
