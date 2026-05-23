# Whetstone Plan 3 — Engagement (Reactions + Comments)

**Goal:** Let group members react to each other's entries with the four canonical reaction kinds (Amen / Praying / Encourage / You Got This) and post plain-text comments. Per spec §5.6.

**Branch off master after Plan 2 is merged.** Branch name: `feat/engagement`.

**Tasks (single implementer can do this in one pass):**

## Task 1: Engagement server actions

**Files:** Create `src/server-actions/engagement.ts`.

```ts
"use server";
import { and, eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { auth } from "@/auth";

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
type ReactionKind = "amen" | "praying" | "encourage" | "you-got-this";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not authenticated");
  return session.user.id;
}

export async function toggleReaction(entryId: string, kind: ReactionKind): Promise<Result> {
  const userId = await requireUserId();
  const existing = await db.select().from(schema.reactions)
    .where(and(
      eq(schema.reactions.entryId, entryId),
      eq(schema.reactions.userId, userId),
      eq(schema.reactions.kind, kind),
    )).limit(1);

  if (existing[0]) {
    await db.delete(schema.reactions).where(eq(schema.reactions.id, existing[0].id));
  } else {
    await db.insert(schema.reactions).values({ entryId, userId, kind });
  }
  revalidatePath("/g");
  return { ok: true, data: undefined };
}

export async function addComment(entryId: string, body: string): Promise<Result> {
  const userId = await requireUserId();
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Comment can't be empty" };
  if (trimmed.length > 2000) return { ok: false, error: "Comment too long" };
  await db.insert(schema.comments).values({ entryId, userId, body: trimmed });
  revalidatePath(`/g`);
  return { ok: true, data: undefined };
}

export async function deleteComment(commentId: string): Promise<Result> {
  const userId = await requireUserId();
  const c = await db.select({ id: schema.comments.id, userId: schema.comments.userId, entryUserId: schema.entries.userId })
    .from(schema.comments)
    .innerJoin(schema.entries, eq(schema.entries.id, schema.comments.entryId))
    .where(eq(schema.comments.id, commentId)).limit(1);
  if (!c[0]) return { ok: false, error: "Comment not found" };
  // Allow: comment author OR entry owner
  if (c[0].userId !== userId && c[0].entryUserId !== userId) {
    return { ok: false, error: "Not authorized" };
  }
  await db.delete(schema.comments).where(eq(schema.comments.id, commentId));
  revalidatePath("/g");
  return { ok: true, data: undefined };
}

export async function getEntryEngagement(entryId: string) {
  // Reactions: list (user_id, kind), plus counts per kind
  const reactions = await db.select({
    userId: schema.reactions.userId,
    kind: schema.reactions.kind,
  }).from(schema.reactions).where(eq(schema.reactions.entryId, entryId));

  const comments = await db.select({
    id: schema.comments.id,
    userId: schema.comments.userId,
    userName: schema.users.name,
    body: schema.comments.body,
    createdAt: schema.comments.createdAt,
  }).from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(eq(schema.comments.entryId, entryId))
    .orderBy(schema.comments.createdAt);

  return { reactions, comments };
}
```

Commit: `feat: engagement server actions (reactions + comments)`

## Task 2: Reactions UI

`src/components/entries/reaction-row.tsx`:
```tsx
"use client";
import { useTransition } from "react";
import { toggleReaction } from "@/server-actions/engagement";
import { Button } from "@/components/ui/button";

const KINDS = [
  { kind: "amen" as const, label: "Amen" },
  { kind: "praying" as const, label: "Praying" },
  { kind: "encourage" as const, label: "Encourage" },
  { kind: "you-got-this" as const, label: "You got this" },
];

type Reaction = { userId: string; kind: string };

export function ReactionRow({
  entryId,
  reactions,
  currentUserId,
}: {
  entryId: string;
  reactions: Reaction[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {KINDS.map(({ kind, label }) => {
        const count = reactions.filter((r) => r.kind === kind).length;
        const mine = reactions.some((r) => r.kind === kind && r.userId === currentUserId);
        return (
          <Button
            key={kind}
            variant={mine ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => startTransition(async () => { await toggleReaction(entryId, kind); })}
          >
            {label}{count > 0 && ` ${count}`}
          </Button>
        );
      })}
    </div>
  );
}
```

Commit: `feat: reaction row UI with optimistic toggle`

## Task 3: Comments UI

`src/components/entries/comments.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { addComment, deleteComment } from "@/server-actions/engagement";
import { Button } from "@/components/ui/button";

type Comment = { id: string; userId: string; userName: string; body: string; createdAt: Date };

export function Comments({
  entryId,
  comments,
  currentUserId,
  entryOwnerId,
}: {
  entryId: string;
  comments: Comment[];
  currentUserId: string;
  entryOwnerId: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const post = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await addComment(entryId, body);
      if (r.ok) setBody("");
    });
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {comments.map((c) => {
          const canDelete = c.userId === currentUserId || entryOwnerId === currentUserId;
          return (
            <li key={c.id} className="border-l-2 border-gray-300 pl-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{c.userName}</span>
                {canDelete && (
                  <button
                    className="text-xs text-gray-500 hover:text-red-600"
                    onClick={() => startTransition(async () => { await deleteComment(c.id); })}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="block flex-1 border rounded p-2 text-sm"
          rows={2}
        />
        <Button onClick={post} disabled={pending || !body.trim()} size="sm">
          {pending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
```

Commit: `feat: comments thread UI`

## Task 4: Entry detail page + EntryCard updates

`src/app/g/[slug]/entries/[entryId]/page.tsx`:
```tsx
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
      <ReactionRow entryId={entryId} reactions={engagement.reactions} currentUserId={session.user.id} />
      <Comments entryId={entryId} comments={engagement.comments} currentUserId={session.user.id} entryOwnerId={entry.userId} />
    </main>
  );
}
```

Update `src/components/entries/entry-card.tsx` to add an optional "View entry" link that links to `/g/[slug]/entries/[id]` when a slug + id are passed. Keep the existing API working (slug+id optional).

In `src/app/g/[slug]/page.tsx`, pass `slug` and `entry.id` to each EntryCard so it can render the link.

Commit: `feat: entry detail page with reactions + comments`

## Task 5: Update group feed to show engagement counts inline

Optional polish: in `getGroupFeedForDate`, also count reactions + comments per entry so the feed cards can show `Amen 3 · 2 comments` without fetching per-entry. Update `EntryCard` to accept optional counts and render them as a footer line linking to the detail page.

Skip if it complicates the SQL — engagement counts are visible on the detail page either way.

Commit (if done): `feat: surface reaction + comment counts on group feed cards`

## Done state for Plan 3

- Group members can toggle one of four reactions per entry
- Plain-text comments thread under each entry
- Comment authors + entry owners can delete comments
- Entry detail page renders all engagement

## Final: tag + merge to master

```
git tag v0.3.0-engagement
git push origin feat/engagement
git push --tags
git checkout master
git merge --no-ff feat/engagement
git push origin master
git branch -d feat/engagement
```
