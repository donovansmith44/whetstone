import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getGroupBySlug } from "@/server-actions/groups";
import { getTemplateWithFields } from "@/server-actions/templates";
import { getEntryEngagement } from "@/server-actions/engagement";
import { EntryCard } from "@/components/entries/entry-card";
import { ReactionRow } from "@/components/entries/reaction-row";
import { Comments } from "@/components/entries/comments";

export default async function EntryDetailPage({ params }: { params: Promise<{ slug: string; entryId: string }> }) {
  const { slug, entryId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");

  const entryRows = await db.select({
    id: schema.entries.id,
    userId: schema.entries.userId,
    templateId: schema.entries.templateId,
    values: schema.entries.values,
    createdAt: schema.entries.createdAt,
    authorName: schema.users.name,
  }).from(schema.entries)
    .innerJoin(schema.users, eq(schema.users.id, schema.entries.userId))
    .where(eq(schema.entries.id, entryId)).limit(1);
  const entry = entryRows[0];
  if (!entry) redirect(`/g/${slug}`);

  const tpl = await getTemplateWithFields(entry.templateId);
  const engagement = await getEntryEngagement(entryId);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <EntryCard
        userName={entry.authorName}
        fields={tpl?.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })) ?? []}
        values={(entry.values as Record<string, string>) ?? {}}
        createdAt={entry.createdAt}
      />
      <ReactionRow entryId={entryId} reactions={engagement.reactions} currentUserId={session.user.id!} />
      <Comments entryId={entryId} comments={engagement.comments} currentUserId={session.user.id!} entryOwnerId={entry.userId} />
    </main>
  );
}
