"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validators";
import { slugify, withDiscriminator } from "@/lib/slugs";
import { generateToken, addExpiry } from "@/lib/tokens";

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not authenticated");
  return session.user.id;
}

export async function createGroup(input: CreateGroupInput): Promise<Result<{ slug: string }>> {
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const userId = await requireUser();
  const { name, description, discordWebhookUrl } = parsed.data;

  // Try a clean slug first; on conflict, add a discriminator
  let slug = slugify(name);
  const existing = await db.select({ id: schema.groups.id })
    .from(schema.groups).where(eq(schema.groups.slug, slug)).limit(1);
  if (existing.length > 0) slug = withDiscriminator(slug);

  const [group] = await db.insert(schema.groups).values({
    slug,
    name,
    description: description || null,
    discordWebhookUrl: discordWebhookUrl || null,
    ownerId: userId,
  }).returning({ id: schema.groups.id, slug: schema.groups.slug });

  await db.insert(schema.groupMembers).values({
    groupId: group.id, userId, role: "owner",
  });

  revalidatePath("/dashboard");
  return { ok: true, data: { slug: group.slug } };
}

export async function generateInvite(slug: string): Promise<Result<{ token: string }>> {
  const userId = await requireUser();
  const group = await db.select().from(schema.groups)
    .where(eq(schema.groups.slug, slug)).limit(1);
  if (!group[0]) return { ok: false, error: "Group not found" };
  // Only members can invite
  const member = await db.select().from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, group[0].id),
      eq(schema.groupMembers.userId, userId),
    )).limit(1);
  if (!member[0]) return { ok: false, error: "Not a member" };

  const token = generateToken();
  await db.insert(schema.groupInvites).values({
    groupId: group[0].id,
    token,
    expiresAt: addExpiry(7 * 24), // 7 days
    createdBy: userId,
  });
  return { ok: true, data: { token } };
}

export async function acceptInvite(token: string): Promise<Result<{ slug: string }>> {
  const userId = await requireUser();
  const rows = await db.select().from(schema.groupInvites)
    .where(and(
      eq(schema.groupInvites.token, token),
      isNull(schema.groupInvites.usedAt),
      gt(schema.groupInvites.expiresAt, new Date()),
    )).limit(1);
  const invite = rows[0];
  if (!invite) return { ok: false, error: "This invite link is invalid or has expired." };

  // Already a member?
  const existing = await db.select().from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, invite.groupId),
      eq(schema.groupMembers.userId, userId),
    )).limit(1);

  if (existing.length === 0) {
    await db.insert(schema.groupMembers).values({
      groupId: invite.groupId, userId, role: "member",
    });
  }

  await db.update(schema.groupInvites)
    .set({ usedAt: new Date(), usedBy: userId })
    .where(eq(schema.groupInvites.id, invite.id));

  const group = await db.select({ slug: schema.groups.slug })
    .from(schema.groups).where(eq(schema.groups.id, invite.groupId)).limit(1);
  revalidatePath("/dashboard");
  return { ok: true, data: { slug: group[0].slug } };
}

export async function leaveGroup(slug: string): Promise<Result> {
  const userId = await requireUser();
  const group = await db.select({ id: schema.groups.id, ownerId: schema.groups.ownerId })
    .from(schema.groups).where(eq(schema.groups.slug, slug)).limit(1);
  if (!group[0]) return { ok: false, error: "Group not found" };
  if (group[0].ownerId === userId) {
    return { ok: false, error: "Owners cannot leave their own group. Delete the group instead." };
  }
  await db.delete(schema.groupMembers).where(and(
    eq(schema.groupMembers.groupId, group[0].id),
    eq(schema.groupMembers.userId, userId),
  ));
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function getMyGroups() {
  const userId = await requireUser();
  return db.select({
    id: schema.groups.id,
    slug: schema.groups.slug,
    name: schema.groups.name,
    role: schema.groupMembers.role,
  }).from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(eq(schema.groupMembers.userId, userId));
}

export async function getGroupBySlug(slug: string) {
  const userId = await requireUser();
  const rows = await db.select({
    id: schema.groups.id,
    slug: schema.groups.slug,
    name: schema.groups.name,
    description: schema.groups.description,
    ownerId: schema.groups.ownerId,
    role: schema.groupMembers.role,
  }).from(schema.groups)
    .innerJoin(schema.groupMembers, and(
      eq(schema.groupMembers.groupId, schema.groups.id),
      eq(schema.groupMembers.userId, userId),
    ))
    .where(eq(schema.groups.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getGroupMembers(groupId: string) {
  return db.select({
    userId: schema.users.id,
    name: schema.users.name,
    email: schema.users.email,
    role: schema.groupMembers.role,
    joinedAt: schema.groupMembers.joinedAt,
  }).from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
    .where(eq(schema.groupMembers.groupId, groupId));
}
