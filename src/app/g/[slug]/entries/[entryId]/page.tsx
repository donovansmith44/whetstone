import Link from "next/link";
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

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
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
    entryDate: schema.entries.entryDate,
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
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {/* Crumb */}
        <Link
          href={`/g/${slug}` as never}
          className="inline-block mb-8"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "10.5px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--color-ink-soft)",
          }}
        >
          ← {group.name}
        </Link>

        <header className="mb-8">
          <span className="eyebrow eyebrow-clay">
            {formatPretty(entry.entryDate)}
          </span>
          <h1
            className="display mt-3"
            style={{
              fontSize: "clamp(32px, 4.5vw, 48px)",
              lineHeight: 0.98,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
            }}
          >
            {entry.authorName}
            <span style={{ color: "var(--color-clay)" }}>'s</span>{" "}
            <span style={{ fontStyle: "italic", color: "var(--color-ink-soft)" }}>entry</span>
          </h1>
        </header>

        <EntryCard
          userName={entry.authorName}
          fields={tpl?.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })) ?? []}
          values={(entry.values as Record<string, string>) ?? {}}
          createdAt={entry.createdAt}
        />

        <section
          className="mt-10 mb-12 pt-8"
          style={{ borderTop: "1px solid var(--color-rule)" }}
        >
          <ReactionRow
            entryId={entryId}
            reactions={engagement.reactions}
            currentUserId={session.user.id!}
          />
        </section>

        <section className="pt-8" style={{ borderTop: "1px solid var(--color-rule)" }}>
          <Comments
            entryId={entryId}
            comments={engagement.comments}
            currentUserId={session.user.id!}
            entryOwnerId={entry.userId}
          />
        </section>
      </div>
    </main>
  );
}

function formatPretty(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.toLocaleDateString("en-US", { weekday: "long" });
  const month = dt.toLocaleDateString("en-US", { month: "long" });
  return `${day} · ${month} ${d}`;
}
