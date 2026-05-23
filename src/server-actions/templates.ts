"use server";

import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { templateSchema, type TemplateInput } from "@/lib/validators";

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not authenticated");
  return session.user.id;
}

export async function createTemplate(input: TemplateInput): Promise<Result<{ id: string }>> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const userId = await requireUser();

  const [template] = await db.insert(schema.templates).values({
    ownerUserId: userId,
    name: parsed.data.name,
    description: parsed.data.description || null,
  }).returning({ id: schema.templates.id });

  for (const f of parsed.data.fields) {
    await db.insert(schema.templateFields).values({
      templateId: template.id,
      key: f.key,
      label: f.label,
      prompt: f.prompt || null,
      type: f.type,
      order: f.order,
      autocompleteFromFieldKey: f.autocompleteFromFieldKey || null,
    });
  }

  // First template auto-becomes active
  const active = await db.select().from(schema.userActiveTemplate)
    .where(eq(schema.userActiveTemplate.userId, userId)).limit(1);
  if (active.length === 0) {
    await db.insert(schema.userActiveTemplate).values({ userId, templateId: template.id });
  }

  revalidatePath("/templates");
  return { ok: true, data: { id: template.id } };
}

export async function updateTemplate(
  parentId: string,
  input: TemplateInput,
): Promise<Result<{ id: string }>> {
  // Templates are immutable. "Edit" = create new row with parentTemplateId set, then re-point active.
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const userId = await requireUser();

  // Verify ownership
  const parent = await db.select().from(schema.templates)
    .where(eq(schema.templates.id, parentId)).limit(1);
  if (!parent[0] || parent[0].ownerUserId !== userId) {
    return { ok: false, error: "Template not found" };
  }

  const [newTemplate] = await db.insert(schema.templates).values({
    ownerUserId: userId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    parentTemplateId: parentId,
  }).returning({ id: schema.templates.id });

  for (const f of parsed.data.fields) {
    await db.insert(schema.templateFields).values({
      templateId: newTemplate.id,
      key: f.key, label: f.label, prompt: f.prompt || null,
      type: f.type, order: f.order,
      autocompleteFromFieldKey: f.autocompleteFromFieldKey || null,
    });
  }

  // If parent was active, swap active to the new one
  const active = await db.select().from(schema.userActiveTemplate)
    .where(eq(schema.userActiveTemplate.userId, userId)).limit(1);
  if (active[0]?.templateId === parentId) {
    await db.update(schema.userActiveTemplate)
      .set({ templateId: newTemplate.id, setAt: new Date() })
      .where(eq(schema.userActiveTemplate.userId, userId));
  }

  revalidatePath("/templates");
  return { ok: true, data: { id: newTemplate.id } };
}

export async function setActiveTemplate(templateId: string): Promise<Result> {
  const userId = await requireUser();
  const t = await db.select().from(schema.templates)
    .where(eq(schema.templates.id, templateId)).limit(1);
  if (!t[0] || t[0].ownerUserId !== userId) return { ok: false, error: "Template not found" };

  const existing = await db.select().from(schema.userActiveTemplate)
    .where(eq(schema.userActiveTemplate.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(schema.userActiveTemplate).values({ userId, templateId });
  } else {
    await db.update(schema.userActiveTemplate)
      .set({ templateId, setAt: new Date() })
      .where(eq(schema.userActiveTemplate.userId, userId));
  }
  revalidatePath("/today");
  return { ok: true, data: undefined };
}

export async function listMyTemplates() {
  const userId = await requireUser();
  return db.select({
    id: schema.templates.id,
    name: schema.templates.name,
    description: schema.templates.description,
    createdAt: schema.templates.createdAt,
  }).from(schema.templates)
    .where(eq(schema.templates.ownerUserId, userId))
    .orderBy(desc(schema.templates.createdAt));
}

export async function getTemplateWithFields(templateId: string) {
  const t = await db.select().from(schema.templates)
    .where(eq(schema.templates.id, templateId)).limit(1);
  if (!t[0]) return null;
  const fields = await db.select().from(schema.templateFields)
    .where(eq(schema.templateFields.templateId, templateId))
    .orderBy(schema.templateFields.order);
  return { ...t[0], fields };
}

export async function getActiveTemplate() {
  const userId = await requireUser();
  const active = await db.select().from(schema.userActiveTemplate)
    .where(eq(schema.userActiveTemplate.userId, userId)).limit(1);
  if (!active[0]) return null;
  return getTemplateWithFields(active[0].templateId);
}

export async function publishTemplateToGroup(templateId: string, groupId: string): Promise<Result> {
  const userId = await requireUser();
  // Verify ownership of template
  const t = await db.select().from(schema.templates)
    .where(eq(schema.templates.id, templateId)).limit(1);
  if (!t[0] || t[0].ownerUserId !== userId) return { ok: false, error: "Template not found" };
  // Verify membership in group
  const m = await db.select().from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, groupId),
      eq(schema.groupMembers.userId, userId),
    )).limit(1);
  if (!m[0]) return { ok: false, error: "Not a member of this group" };
  // Idempotent insert (UNIQUE primary key on template_id+group_id)
  await db.insert(schema.templatePublications).values({
    templateId, groupId, publishedBy: userId,
  }).onConflictDoNothing();
  revalidatePath(`/g`);
  return { ok: true, data: undefined };
}

export async function publishToGroupBySlug(templateId: string, slug: string): Promise<Result> {
  const group = (await db.select({ id: schema.groups.id })
    .from(schema.groups).where(eq(schema.groups.slug, slug)).limit(1))[0];
  if (!group) return { ok: false, error: "Group not found" };
  return publishTemplateToGroup(templateId, group.id);
}

export async function cloneTemplate(sourceTemplateId: string): Promise<Result<{ id: string }>> {
  const userId = await requireUser();
  const source = await getTemplateWithFields(sourceTemplateId);
  if (!source) return { ok: false, error: "Template not found" };

  const [cloned] = await db.insert(schema.templates).values({
    ownerUserId: userId,
    name: source.name,
    description: source.description,
    parentTemplateId: sourceTemplateId,
  }).returning({ id: schema.templates.id });

  for (const f of source.fields) {
    await db.insert(schema.templateFields).values({
      templateId: cloned.id,
      key: f.key, label: f.label, prompt: f.prompt,
      type: f.type, order: f.order,
      autocompleteFromFieldKey: f.autocompleteFromFieldKey,
    });
  }

  // Auto-set active if user has none
  const active = await db.select().from(schema.userActiveTemplate)
    .where(eq(schema.userActiveTemplate.userId, userId)).limit(1);
  if (active.length === 0) {
    await db.insert(schema.userActiveTemplate).values({ userId, templateId: cloned.id });
  }
  revalidatePath("/templates");
  return { ok: true, data: { id: cloned.id } };
}

export async function getPublishedTemplatesForGroup(groupId: string) {
  return db.select({
    templateId: schema.templates.id,
    name: schema.templates.name,
    description: schema.templates.description,
    publishedBy: schema.users.name,
    publishedAt: schema.templatePublications.publishedAt,
  }).from(schema.templatePublications)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templatePublications.templateId))
    .innerJoin(schema.users, eq(schema.users.id, schema.templatePublications.publishedBy))
    .where(eq(schema.templatePublications.groupId, groupId));
}
