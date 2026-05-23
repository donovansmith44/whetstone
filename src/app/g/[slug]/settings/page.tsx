import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGroupBySlug, getGroupMembers } from "@/server-actions/groups";
import { MemberList } from "@/components/groups/member-list";

export default async function GroupSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");
  const members = await getGroupMembers(group.id);
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{group.name} — Settings</h1>
      <MemberList members={members} currentUserId={session.user.id} groupSlug={slug} isOwner={group.role === "owner"} />
    </main>
  );
}
