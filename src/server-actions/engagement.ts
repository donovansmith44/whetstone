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
