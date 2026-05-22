"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { signupSchema, type SignupInput } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { generateToken, addExpiry } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signup(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, name, password } = parsed.data;

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(schema.users)
    .values({ email, name, passwordHash })
    .returning({ id: schema.users.id });

  await db.insert(schema.userPreferences).values({ userId: user.id });

  const token = generateToken();
  await db.insert(schema.tokens).values({
    userId: user.id,
    kind: "email_verify",
    token,
    expiresAt: addExpiry(24),
  });

  try {
    await sendVerificationEmail(email, token);
  } catch (err) {
    console.error("verification email failed", err);
    return { ok: false, error: "Account created but we couldn't send the verification email. Try again later." };
  }

  return { ok: true };
}
