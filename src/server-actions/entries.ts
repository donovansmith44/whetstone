"use server";

import { and, eq, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { entrySchema, type EntryInput } from "@/lib/validators";
import { getActiveTemplate, getTemplateWithFields } from "./templates";
import { todayInTimezone, isPastMidnight } from "@/lib/dates";

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not authenticated");
  return session.user;
}

async function getUserTimezone(userId: string): Promise<string> {
  const u = await db.select({ timezone: schema.users.timezone })
    .from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return u[0]?.timezone ?? "America/New_York";
}

export async function getTodayEntryView() {
  const user = await requireSession();
  const tz = await getUserTimezone(user.id);
  const today = todayInTimezone(tz);
  const template = await getActiveTemplate();
  if (!template) return { template: null, entry: null, prefill: {} as Record<string, string>, today };

  const todayRows = await db.select().from(schema.entries)
    .where(and(eq(schema.entries.userId, user.id), eq(schema.entries.entryDate, today)))
    .limit(1);
  const todayEntry = todayRows[0] ?? null;

  // Autocomplete prefill: most recent entry (any date) of mine
  const prefill: Record<string, string> = {};
  if (!todayEntry) {
    const prevRows = await db.select().from(schema.entries)
      .where(eq(schema.entries.userId, user.id))
      .orderBy(desc(schema.entries.entryDate)).limit(1);
    const prev = prevRows[0];
    if (prev) {
      const prevValues = prev.values as Record<string, string>;
      for (const f of template.fields) {
        if (f.autocompleteFromFieldKey && prevValues[f.autocompleteFromFieldKey]) {
          prefill[f.key] = prevValues[f.autocompleteFromFieldKey];
        }
      }
    }
  }

  return { template, entry: todayEntry, prefill, today };
}

export async function submitEntry(input: EntryInput): Promise<Result> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const user = await requireSession();
  const tz = await getUserTimezone(user.id);
  const today = todayInTimezone(tz);

  // Existing entry?
  const existingRows = await db.select().from(schema.entries)
    .where(and(eq(schema.entries.userId, user.id), eq(schema.entries.entryDate, today)))
    .limit(1);
  const existing = existingRows[0];

  if (existing) {
    if (isPastMidnight(existing.entryDate, tz)) {
      return { ok: false, error: "Today's entry is locked." };
    }
    await db.update(schema.entries)
      .set({ values: parsed.data.values, updatedAt: new Date() })
      .where(eq(schema.entries.id, existing.id));
  } else {
    await db.insert(schema.entries).values({
      userId: user.id,
      templateId: parsed.data.templateId,
      entryDate: today,
      values: parsed.data.values,
    });
  }

  revalidatePath("/today");
  return { ok: true, data: undefined };
}

/** Today's entries from all members of a group (including the viewer). */
export async function getGroupFeedForDate(groupId: string, date: string) {
  await requireSession();
  // Members of this group
  const members = await db.select({ userId: schema.groupMembers.userId, name: schema.users.name })
    .from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
    .where(eq(schema.groupMembers.groupId, groupId));
  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) return [];

  const entries = await db.select({
    id: schema.entries.id,
    userId: schema.entries.userId,
    templateId: schema.entries.templateId,
    values: schema.entries.values,
    createdAt: schema.entries.createdAt,
  }).from(schema.entries)
    .where(and(
      inArray(schema.entries.userId, memberIds),
      eq(schema.entries.entryDate, date),
    ))
    .orderBy(desc(schema.entries.createdAt));

  // Hydrate each entry with its template fields
  const out = [] as Array<{
    id: string;
    userId: string;
    userName: string;
    fields: { key: string; label: string; type: string }[];
    values: Record<string, string>;
    createdAt: Date;
  }>;
  for (const e of entries) {
    const tpl = await getTemplateWithFields(e.templateId);
    if (!tpl) continue;
    const member = members.find((m) => m.userId === e.userId);
    out.push({
      id: e.id,
      userId: e.userId,
      userName: member?.name ?? "(unknown)",
      fields: tpl.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
      values: (e.values as Record<string, string>) ?? {},
      createdAt: e.createdAt,
    });
  }
  return out;
}

/** Last N entries for the signed-in user, newest first — for the /me history page. */
export async function getMyHistory(limit = 30) {
  const user = await requireSession();
  const rows = await db.select({
    id: schema.entries.id,
    templateId: schema.entries.templateId,
    entryDate: schema.entries.entryDate,
    values: schema.entries.values,
    createdAt: schema.entries.createdAt,
  }).from(schema.entries)
    .where(eq(schema.entries.userId, user.id))
    .orderBy(desc(schema.entries.entryDate))
    .limit(limit);

  const out = [] as Array<{
    id: string;
    entryDate: string;
    fields: { key: string; label: string; type: string }[];
    values: Record<string, string>;
    createdAt: Date;
  }>;
  for (const e of rows) {
    const tpl = await getTemplateWithFields(e.templateId);
    if (!tpl) continue;
    out.push({
      id: e.id,
      entryDate: e.entryDate,
      fields: tpl.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
      values: (e.values as Record<string, string>) ?? {},
      createdAt: e.createdAt,
    });
  }
  return out;
}

/** Distinct dates with at least one entry from any group member, for the calendar/history view. */
export async function getGroupHistoryDates(groupId: string, limit = 60) {
  await requireSession();
  const members = await db.select({ userId: schema.groupMembers.userId })
    .from(schema.groupMembers).where(eq(schema.groupMembers.groupId, groupId));
  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) return [];
  const rows = await db.selectDistinct({ entryDate: schema.entries.entryDate })
    .from(schema.entries)
    .where(inArray(schema.entries.userId, memberIds))
    .orderBy(desc(schema.entries.entryDate))
    .limit(limit);
  return rows.map((r) => r.entryDate);
}
