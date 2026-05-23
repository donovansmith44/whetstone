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
