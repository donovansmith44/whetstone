import { redirect } from "next/navigation";
import { getGroupBySlug } from "@/server-actions/groups";
import { InviteLink } from "@/components/groups/invite-link";

export default async function GroupInvitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");
  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Invite to {group.name}</h1>
      <InviteLink slug={slug} />
    </main>
  );
}
