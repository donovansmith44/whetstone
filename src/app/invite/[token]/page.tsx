import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/server-actions/groups";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) {
    // Bounce to signin, preserving the invite token via a return path
    redirect(`/signin?next=/invite/${token}`);
  }
  const result = await acceptInvite(token);
  if (result.ok) redirect(`/g/${result.data.slug}` as never); // /g/[slug]/page.tsx arrives in a later task
  return (
    <main className="min-h-screen p-6 max-w-md mx-auto text-center space-y-4">
      <h1 className="text-xl font-semibold">Couldn't accept invite</h1>
      <p className="text-gray-600">{result.error}</p>
    </main>
  );
}
