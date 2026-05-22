"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { signupSchema, type SignupInput, resetRequestSchema, type ResetRequestInput, resetConfirmSchema, type ResetConfirmInput } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { generateToken, addExpiry } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

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

export async function verifyEmailToken(token: string): Promise<ActionResult> {
  const rows = await db
    .select()
    .from(schema.tokens)
    .where(
      and(
        eq(schema.tokens.token, token),
        eq(schema.tokens.kind, "email_verify"),
        isNull(schema.tokens.usedAt),
        gt(schema.tokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const tokenRow = rows[0];
  if (!tokenRow) {
    return { ok: false, error: "This verification link is invalid or has expired." };
  }

  await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(schema.users.id, tokenRow.userId));

  await db
    .update(schema.tokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.tokens.id, tokenRow.id));

  return { ok: true };
}

export async function requestPasswordReset(input: ResetRequestInput): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid email" };
  }
  const { email } = parsed.data;

  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  const user = rows[0];

  // Always return ok to avoid leaking whether an email is registered.
  if (!user) return { ok: true };

  const token = generateToken();
  await db.insert(schema.tokens).values({
    userId: user.id,
    kind: "password_reset",
    token,
    expiresAt: addExpiry(1), // 1 hour
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch (err) {
    console.error("password reset email failed", err);
  }

  return { ok: true };
}

export async function confirmPasswordReset(input: ResetConfirmInput): Promise<ActionResult> {
  const parsed = resetConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, password } = parsed.data;

  const rows = await db
    .select()
    .from(schema.tokens)
    .where(
      and(
        eq(schema.tokens.token, token),
        eq(schema.tokens.kind, "password_reset"),
        isNull(schema.tokens.usedAt),
        gt(schema.tokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const tokenRow = rows[0];
  if (!tokenRow) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, tokenRow.userId));

  await db
    .update(schema.tokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.tokens.id, tokenRow.id));

  return { ok: true };
}
