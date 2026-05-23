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
