import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { postToDiscord } from "@/lib/discord";
import { todayInTimezone } from "@/lib/dates";

// Hit by Vercel Cron (configured in vercel.json). Auth via CRON_SECRET header.
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Pull all groups with webhooks
  const groups = await db.select().from(schema.groups)
    .where(isNotNull(schema.groups.discordWebhookUrl));

  const sent: Array<{ groupId: string; userId: string }> = [];

  for (const group of groups) {
    if (!group.discordWebhookUrl) continue;

    // Members with reminderEnabled
    const members = await db.select({
      userId: schema.users.id,
      userName: schema.users.name,
      timezone: schema.users.timezone,
      reminderTime: schema.userPreferences.reminderTime,
      reminderEnabled: schema.userPreferences.reminderEnabled,
    }).from(schema.groupMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
      .innerJoin(schema.userPreferences, eq(schema.userPreferences.userId, schema.users.id))
      .where(eq(schema.groupMembers.groupId, group.id));

    for (const m of members) {
      if (!m.reminderEnabled) continue;

      const today = todayInTimezone(m.timezone);
      // Has entry for today?
      const todayEntry = await db.select().from(schema.entries)
        .where(and(
          eq(schema.entries.userId, m.userId),
          eq(schema.entries.entryDate, today),
        )).limit(1);
      if (todayEntry.length > 0) continue;

      // Is it past their reminder time? Compute current HH:MM in their tz.
      const nowInTz = new Intl.DateTimeFormat("en-US", {
        timeZone: m.timezone, hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(new Date());
      const [nowH, nowM] = nowInTz.split(":").map(Number);
      const [remH, remM] = m.reminderTime.split(":").slice(0, 2).map(Number);
      const nowMins = nowH * 60 + nowM;
      const remMins = remH * 60 + remM;
      // Window: reminder_time through reminder_time + 11h
      if (nowMins < remMins || nowMins > remMins + 11 * 60) continue;

      // Dedupe via NotificationLog
      try {
        await db.insert(schema.notificationLog).values({
          userId: m.userId, groupId: group.id, kind: "daily-reminder", date: today,
        });
      } catch {
        // unique violation = already sent
        continue;
      }

      const url = process.env.AUTH_URL ?? "https://whetstone.app";
      try {
        await postToDiscord(group.discordWebhookUrl, {
          content: `**${m.userName}** hasn't checked in yet today — ${url}/today`,
        });
        sent.push({ groupId: group.id, userId: m.userId });
      } catch (err) {
        console.error("discord post failed", err);
        // Roll back the NotificationLog so we'll retry next cron tick
        await db.delete(schema.notificationLog).where(and(
          eq(schema.notificationLog.userId, m.userId),
          eq(schema.notificationLog.groupId, group.id),
          eq(schema.notificationLog.kind, "daily-reminder"),
          eq(schema.notificationLog.date, today),
        ));
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
