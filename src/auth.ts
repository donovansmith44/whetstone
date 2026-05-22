// NOTE: DrizzleAdapter is intentionally omitted.
// Whetstone v1 uses credentials-only login with JWT session strategy.
// The DrizzleAdapter requires schema columns (emailVerified, image) that
// differ from Whetstone's schema (emailVerifiedAt, imageUrl), and the
// adapter provides no value for credentials+JWT flows where sessions are
// stored in signed cookies, not the database. If OAuth providers or
// database sessions are added later, reconcile the schema and re-add the
// adapter at that point.

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyPassword } from "@/lib/password";
import { signinSchema } from "@/lib/validators";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      emailVerifiedAt: Date | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = signinSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const rows = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);
        const user = rows[0];
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerifiedAt: user.emailVerifiedAt,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.emailVerifiedAt = (user as { emailVerifiedAt: Date | null })
          .emailVerifiedAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.emailVerifiedAt =
          (token.emailVerifiedAt as Date | null) ?? null;
      }
      return session;
    },
  },
});
