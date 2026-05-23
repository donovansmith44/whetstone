# Whetstone Plan 5 — Notifications (Discord webhook + Vercel Cron)

**Goal:** Daily reminder POSTs into a group's Discord channel when a member hasn't checked in by their reminder time. Optional ping when someone DOES post.

**Branch:** `feat/notifications`

## Task 1: Discord webhook helper

`src/lib/discord.ts`:
```ts
export type DiscordMessage = {
  content: string;
};

export async function postToDiscord(webhookUrl: string, msg: DiscordMessage): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord webhook failed: ${res.status} ${body}`);
  }
}
```

Commit: `feat: Discord webhook helper`

## Task 2: User preferences UI

Add settings page or section where users can:
- Toggle `reminderEnabled`
- Set `reminderTime` (HH:MM in their tz)
- Update their timezone

`src/app/me/settings/page.tsx`:
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { updatePreferences } from "@/server-actions/preferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const prefs = (await db.select().from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, session.user.id)).limit(1))[0];
  const user = (await db.select().from(schema.users)
    .where(eq(schema.users.id, session.user.id)).limit(1))[0];

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Preferences</h1>
      <form action={updatePreferences} className="space-y-4">
        <div>
          <Label htmlFor="timezone">Timezone (IANA)</Label>
          <Input id="timezone" name="timezone" defaultValue={user.timezone} />
        </div>
        <div>
          <Label htmlFor="reminderTime">Reminder time (HH:MM, local)</Label>
          <Input id="reminderTime" name="reminderTime" type="time" defaultValue={prefs.reminderTime} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="reminderEnabled" name="reminderEnabled" defaultChecked={prefs.reminderEnabled} />
          <Label htmlFor="reminderEnabled">Send me reminders via Discord</Label>
        </div>
        <Button type="submit">Save</Button>
      </form>
    </main>
  );
}
```

`src/server-actions/preferences.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

export async function updatePreferences(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not authenticated");
  const userId = session.user.id;

  const timezone = String(formData.get("timezone") ?? "America/New_York");
  const reminderTime = String(formData.get("reminderTime") ?? "09:00") + ":00";
  const reminderEnabled = formData.get("reminderEnabled") === "on";

  await db.update(schema.users).set({ timezone }).where(eq(schema.users.id, userId));
  await db.update(schema.userPreferences)
    .set({ reminderTime, reminderEnabled })
    .where(eq(schema.userPreferences.userId, userId));
  revalidatePath("/me/settings");
}
```

Commit: `feat: user preferences page (tz + reminder time + toggle)`

## Task 3: Cron API route

`src/app/api/cron/reminders/route.ts`:
```ts
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
```

Commit: `feat: cron reminder route (Discord webhook + NotificationLog dedupe)`

## Task 4: Vercel cron config

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "*/30 * * * *" }
  ]
}
```

Document in README that `CRON_SECRET` env var must be set in Vercel project settings.

Commit: `feat: configure Vercel Cron for /api/cron/reminders (every 30 min)`

## Task 5: Verify locally

You can hit the route manually:
```
curl -X GET "http://localhost:3000/api/cron/reminders" -H "Authorization: Bearer <CRON_SECRET>"
```

Returns `{ ok: true, sent: [] }` if no users qualify. Without CRON_SECRET set in env, the auth check is skipped (dev convenience).

Add a brief note in README about the cron route and how to test it.

Commit: `docs: README note on cron testing`

## Done state

- Users can configure their reminder time + timezone + enable/disable reminders
- Groups can store a Discord webhook URL (already in schema from Plan 1)
- A Vercel Cron route runs every 30 min, checks each group, finds members without today's entry within their reminder window, posts to Discord, and dedupes via NotificationLog

## Final

```
git tag v0.5.0-notifications
git push origin feat/notifications
git push --tags
git checkout master
git merge --no-ff feat/notifications -m "Merge feat/notifications into master

Plan 5 shipped: Discord webhook reminders driven by Vercel Cron + user
preferences page for reminder time/tz.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git branch -d feat/notifications
```
