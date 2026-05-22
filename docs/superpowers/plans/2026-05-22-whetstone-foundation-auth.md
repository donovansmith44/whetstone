# Whetstone Foundation + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Whetstone Next.js app and ship complete email/password auth so a user can sign up, verify their email, sign in, reset their password, and land on an authenticated placeholder dashboard.

**Architecture:** Next.js 15 App Router + TypeScript. Postgres on Neon via Drizzle ORM with the full v1 schema in place (so later plans only add rows / queries, not migrations). Auth via NextAuth v5 credentials provider with a custom bcrypt password store. Custom verification + password-reset token flows backed by the `verification_tokens` table NextAuth provides. Resend for transactional email. shadcn/ui forms on Tailwind v4.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM, @neondatabase/serverless, NextAuth v5, @auth/drizzle-adapter, bcryptjs, Resend, Zod, React Hook Form, Vitest.

**Spec:** [`../specs/2026-05-22-whetstone-design.md`](../specs/2026-05-22-whetstone-design.md). This plan implements §3 (stack), §4 (data model, full schema), and §5.1 (auth/onboarding flow).

---

## File Structure

```
whetstone/
├── package.json                          # deps + scripts
├── tsconfig.json                         # TS config
├── next.config.ts                        # Next.js config
├── tailwind.config.ts                    # Tailwind v4 config
├── postcss.config.mjs                    # PostCSS
├── drizzle.config.ts                     # Drizzle migration config
├── vitest.config.ts                      # test runner
├── components.json                       # shadcn/ui registry config
├── .env.example                          # env template, committed
├── .env.local                            # real secrets, gitignored
│
├── drizzle/                              # generated SQL migrations
│   └── 0000_initial.sql                  # produced by drizzle-kit
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # root layout (fonts, providers)
│   │   ├── page.tsx                      # landing (public)
│   │   ├── globals.css                   # Tailwind directives
│   │   ├── api/auth/[...nextauth]/
│   │   │   └── route.ts                  # NextAuth handler
│   │   ├── signup/page.tsx               # signup form page
│   │   ├── signin/page.tsx               # signin form page
│   │   ├── verify-email/
│   │   │   ├── page.tsx                  # "check your email" landing
│   │   │   └── [token]/page.tsx          # verify handler page
│   │   ├── reset-password/
│   │   │   ├── page.tsx                  # request reset form
│   │   │   └── [token]/page.tsx          # set-new-password form
│   │   └── dashboard/page.tsx            # auth-required placeholder
│   │
│   ├── auth.ts                           # NextAuth v5 config (server)
│   ├── middleware.ts                     # route protection
│   │
│   ├── db/
│   │   ├── index.ts                      # db client (Neon + Drizzle)
│   │   └── schema.ts                     # all v1 tables
│   │
│   ├── lib/
│   │   ├── password.ts                   # bcrypt wrappers
│   │   ├── tokens.ts                     # opaque token generation
│   │   ├── email.ts                      # Resend wrapper + templates
│   │   └── validators.ts                 # Zod schemas for auth forms
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn primitives (added per-task)
│   │   └── auth/
│   │       ├── signup-form.tsx
│   │       ├── signin-form.tsx
│   │       ├── reset-request-form.tsx
│   │       └── reset-confirm-form.tsx
│   │
│   └── server-actions/
│       └── auth.ts                       # signup, verify, request-reset, do-reset
│
└── tests/
    ├── lib/
    │   ├── password.test.ts
    │   ├── tokens.test.ts
    │   └── validators.test.ts
    └── setup.ts                          # vitest globals
```

**Boundaries:**
- `src/db/` owns the schema and the connection client. Everything else imports from `@/db`.
- `src/lib/` is pure functions only (no React, no DB connection). Easy to unit-test.
- `src/server-actions/` is the boundary where DB + email side effects happen. Called from forms.
- `src/components/auth/` is the UI layer; forms call server actions and render results.
- `src/auth.ts` configures NextAuth and is the single place that knows about session shape.

---

## Task 1: Bootstrap the Next.js project manually

The repo already has `.git`, `README.md`, `.gitignore`, and `docs/`. `create-next-app` refuses non-empty directories, so we scaffold by hand.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create `package.json`**

`package.json`:
```json
{
  "name": "whetstone",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Install initial deps**

Run: `npm install`
Expected: no errors, `node_modules/` populated.

- [ ] **Step 3: Write `tsconfig.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.ts`**

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { typedRoutes: true },
};

export default nextConfig;
```

- [ ] **Step 5: Write `postcss.config.mjs`** (for Tailwind v4)

`postcss.config.mjs`:
```js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

- [ ] **Step 6: Write minimal app shell**

`src/app/globals.css`:
```css
@import "tailwindcss";
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whetstone",
  description: "Daily accountability check-ins with your group.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen p-10">
      <h1 className="text-2xl font-bold">Whetstone</h1>
      <p>Coming soon.</p>
    </main>
  );
}
```

- [ ] **Step 7: Update `.gitignore` for Next.js**

Append to the existing `.gitignore`:
```
# next.js
.next/
out/
next-env.d.ts
*.tsbuildinfo

# vitest
coverage/
```

- [ ] **Step 8: Verify the app builds + runs**

Run: `npm run dev`
Expected: server starts on http://localhost:3000, page renders "Whetstone / Coming soon."

Stop the server (Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs .gitignore src/app/
git commit -m "feat: bootstrap Next.js 15 + TS app shell"
```

---

## Task 2: Install Tailwind v4 + shadcn/ui

**Files:**
- Modify: `package.json`, `src/app/globals.css`
- Create: `components.json`, `tailwind.config.ts`, `src/lib/utils.ts`

- [ ] **Step 1: Install Tailwind v4 + shadcn deps**

Run:
```
npm install -D tailwindcss@^4 @tailwindcss/postcss
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/node
```

Expected: deps added without errors.

- [ ] **Step 2: Write `tailwind.config.ts`** (tokens placeholder; real palette set later by frontend-design)

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Placeholder warm-neutral palette. Real palette comes from
        // the frontend-design polish pass (Plan 6).
        sand: { 50: "#fdfaf5", 100: "#f6efe4", 200: "#e9ddc6" },
        ink: { 900: "#1a1814", 700: "#3d362a" },
        accent: { 500: "#a04e3c" }, // terracotta
      },
    },
  },
};

export default config;
```

- [ ] **Step 3: Write `src/lib/utils.ts`** (shadcn `cn` helper)

`src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Write `components.json`** (shadcn config)

`components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "stone",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib"
  }
}
```

- [ ] **Step 5: Install the base shadcn components we need**

Run:
```
npx shadcn@latest add button input label card form alert
```

When prompted, accept defaults. This populates `src/components/ui/`.

Expected: ~6 files appear in `src/components/ui/`.

- [ ] **Step 6: Verify the dev server still renders**

Run: `npm run dev`, visit http://localhost:3000.
Expected: page still shows "Whetstone / Coming soon", no console errors.

Stop the server.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json components.json tailwind.config.ts src/
git commit -m "feat: add Tailwind v4 + shadcn/ui scaffolding"
```

---

## Task 3: Set up Neon + Drizzle connection

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`, `src/db/index.ts`, `.env.example`, `.env.local`

- [ ] **Step 1: Sign up for Neon and create the project (one-time)**

Manual: go to https://neon.tech → sign up → create a new project called `whetstone` → copy the connection string (looks like `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/whetstone?sslmode=require`).

- [ ] **Step 2: Install Drizzle + Neon driver**

Run:
```
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

- [ ] **Step 3: Write `.env.example`** (committed)

`.env.example`:
```
# Neon Postgres
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# NextAuth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Resend
RESEND_API_KEY=""
RESEND_FROM_EMAIL="Whetstone <onboarding@yourdomain.com>"
```

- [ ] **Step 4: Write `.env.local`** (gitignored, real values)

`.env.local` (paste your actual Neon URL):
```
DATABASE_URL="<paste your Neon URL here>"
AUTH_SECRET="<run: openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""
```

On Windows PowerShell, generate AUTH_SECRET with:
```
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

- [ ] **Step 5: Write `drizzle.config.ts`**

`drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

- [ ] **Step 6: Install dotenv for the Drizzle CLI**

Run: `npm install -D dotenv`

- [ ] **Step 7: Write `src/db/index.ts`**

`src/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export { schema };
```

- [ ] **Step 8: Verify env var loading**

Create a temporary script `scripts/check-db.ts`:
```ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`select 1 as ok`;
console.log("DB ok:", rows);
```

Run: `npx tsx scripts/check-db.ts` (install tsx if needed: `npm install -D tsx`).
Expected: `DB ok: [ { ok: 1 } ]`

Delete `scripts/check-db.ts` after the check passes (one-shot diagnostic).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts src/db/index.ts .env.example
git commit -m "feat: connect to Neon Postgres via Drizzle"
```

(Do NOT commit `.env.local` — verify it's gitignored.)

---

## Task 4: Define the full v1 Drizzle schema

Per spec §4 we want ALL tables in place from day one, so later plans only add queries.

**Files:**
- Create: `src/db/schema.ts`

- [ ] **Step 1: Write the schema (auth + domain tables)**

`src/db/schema.ts`:
```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
  jsonb,
  primaryKey,
  unique,
  time,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// AUTH-ADJACENT TABLES
// ──────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  reminderTime: time("reminder_time").notNull().default("09:00:00"),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
});

// Verification + password-reset tokens
export const tokens = pgTable(
  "tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'email_verify' | 'password_reset'
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "tokens_kind_check",
      sql`${t.kind} in ('email_verify', 'password_reset')`,
    ),
  ],
);

// NextAuth sessions table (we use JWT strategy, but keeping table for
// future provider expansion is cheap)
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

// ──────────────────────────────────────────────────────────────
// GROUPS
// ──────────────────────────────────────────────────────────────

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  discordWebhookUrl: text("discord_webhook_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    check("group_members_role_check", sql`${t.role} in ('owner', 'member')`),
  ],
);

export const groupInvites = pgTable("group_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

// ──────────────────────────────────────────────────────────────
// TEMPLATES (immutable; edits create new rows)
// ──────────────────────────────────────────────────────────────

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  parentTemplateId: uuid("parent_template_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templateFields = pgTable(
  "template_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    prompt: text("prompt"),
    type: text("type").notNull(),
    order: integer("order").notNull(),
    autocompleteFromFieldKey: text("autocomplete_from_field_key"),
  },
  (t) => [
    unique("template_fields_template_id_key_unique").on(t.templateId, t.key),
    check(
      "template_fields_type_check",
      sql`${t.type} in ('text', 'textarea', 'list', 'number')`,
    ),
  ],
);

export const userActiveTemplate = pgTable("user_active_template", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "restrict" }),
  setAt: timestamp("set_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templatePublications = pgTable(
  "template_publications",
  {
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.templateId, t.groupId] })],
);

// ──────────────────────────────────────────────────────────────
// ENTRIES + ENGAGEMENT
// ──────────────────────────────────────────────────────────────

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "restrict" }),
    entryDate: date("entry_date").notNull(),
    values: jsonb("values").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("entries_user_date_unique").on(t.userId, t.entryDate)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("reactions_entry_user_kind_unique").on(t.entryId, t.userId, t.kind),
    check(
      "reactions_kind_check",
      sql`${t.kind} in ('amen', 'praying', 'encourage', 'you-got-this')`,
    ),
  ],
);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    date: date("date").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("notification_log_unique").on(t.userId, t.groupId, t.kind, t.date),
  ],
);
```

- [ ] **Step 2: Verify the schema typechecks**

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: define full v1 Drizzle schema"
```

---

## Task 5: Generate + run the initial migration

**Files:**
- Create: `drizzle/0000_*.sql` (auto-generated)

- [ ] **Step 1: Generate the migration**

Run: `npm run db:generate`
Expected: a new file appears under `drizzle/` (e.g. `drizzle/0000_skinny_marauders.sql`) plus `drizzle/meta/` files.

- [ ] **Step 2: Inspect the generated SQL**

Open the generated `drizzle/0000_*.sql` and verify it contains `CREATE TABLE` statements for all 13 tables from Task 4 (users, user_preferences, tokens, sessions, groups, group_members, group_invites, templates, template_fields, user_active_template, template_publications, entries, reactions, comments, notification_log).

If anything's missing or wrong, fix `src/db/schema.ts` and re-run generate.

- [ ] **Step 3: Apply the migration to Neon**

Run: `npm run db:migrate`
Expected: "Migrations completed successfully" or similar.

- [ ] **Step 4: Verify in Neon**

Run: `npm run db:studio` (opens Drizzle Studio in browser).
Expected: all 13 tables listed in the sidebar, empty.

Close studio.

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "feat: initial migration creating all v1 tables"
```

---

## Task 6: Install Vitest + write pure-function tests (TDD for lib helpers)

**Files:**
- Modify: `package.json` (add vitest)
- Create: `vitest.config.ts`, `tests/setup.ts`, `src/lib/password.ts`, `src/lib/tokens.ts`, `src/lib/validators.ts`, `tests/lib/password.test.ts`, `tests/lib/tokens.test.ts`, `tests/lib/validators.test.ts`

- [ ] **Step 1: Install Vitest + supporting deps**

Run:
```
npm install -D vitest @vitest/ui
npm install bcryptjs zod
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Write `vitest.config.ts`**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Write `tests/setup.ts`**

`tests/setup.ts`:
```ts
// Placeholder for future global test setup (e.g., DB fixtures).
// Empty for now — pure-function tests don't need it.
export {};
```

- [ ] **Step 4 (TDD): Write the failing password test**

`tests/lib/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashes a password and verifies it back", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for the same password (salt)", async () => {
    const a = await hashPassword("hunter2");
    const b = await hashPassword("hunter2");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 5: Run the test to confirm it fails**

Run: `npm test -- password`
Expected: FAIL — module `@/lib/password` not found.

- [ ] **Step 6: Implement `src/lib/password.ts`**

`src/lib/password.ts`:
```ts
import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 7: Run the test to confirm it passes**

Run: `npm test -- password`
Expected: 3 tests pass.

- [ ] **Step 8 (TDD): Write the failing tokens test**

`tests/lib/tokens.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateToken, addExpiry } from "@/lib/tokens";

describe("tokens", () => {
  it("generates URL-safe tokens of expected length", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(32);
  });

  it("generates unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it("addExpiry returns a Date in the future by the given hours", () => {
    const now = new Date("2026-05-22T12:00:00Z");
    const later = addExpiry(24, now);
    expect(later.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
```

- [ ] **Step 9: Run to confirm it fails**

Run: `npm test -- tokens`
Expected: FAIL — module not found.

- [ ] **Step 10: Implement `src/lib/tokens.ts`**

`src/lib/tokens.ts`:
```ts
import { randomBytes } from "node:crypto";

/** URL-safe base64 token, ~43 chars from 32 random bytes. */
export function generateToken(): string {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function addExpiry(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}
```

- [ ] **Step 11: Run to confirm it passes**

Run: `npm test -- tokens`
Expected: 3 tests pass.

- [ ] **Step 12 (TDD): Write the failing validators test**

`tests/lib/validators.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { signupSchema, signinSchema, resetRequestSchema, resetConfirmSchema } from "@/lib/validators";

describe("validators", () => {
  it("signupSchema accepts a valid payload", () => {
    const result = signupSchema.safeParse({
      email: "donovan@example.com",
      name: "Donovan",
      password: "longenough123",
    });
    expect(result.success).toBe(true);
  });

  it("signupSchema rejects short passwords", () => {
    const result = signupSchema.safeParse({
      email: "a@b.com",
      name: "A",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("signupSchema rejects bad emails", () => {
    const result = signupSchema.safeParse({
      email: "notanemail",
      name: "A",
      password: "longenough123",
    });
    expect(result.success).toBe(false);
  });

  it("signinSchema accepts email + password only", () => {
    const result = signinSchema.safeParse({
      email: "a@b.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("resetRequestSchema requires an email", () => {
    expect(resetRequestSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(resetRequestSchema.safeParse({}).success).toBe(false);
  });

  it("resetConfirmSchema requires token + new password", () => {
    expect(
      resetConfirmSchema.safeParse({ token: "abc", password: "longenough123" }).success,
    ).toBe(true);
    expect(
      resetConfirmSchema.safeParse({ token: "abc", password: "short" }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 13: Run to confirm it fails**

Run: `npm test -- validators`
Expected: FAIL — module not found.

- [ ] **Step 14: Implement `src/lib/validators.ts`**

`src/lib/validators.ts`:
```ts
import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  name: z.string().min(1, "Name is required").max(80),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetRequestSchema = z.object({
  email: z.string().email(),
});

export const resetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type ResetConfirmInput = z.infer<typeof resetConfirmSchema>;
```

- [ ] **Step 15: Run all lib tests together**

Run: `npm test`
Expected: all tests in `tests/lib/` pass (~9 tests).

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/ src/lib/
git commit -m "feat: add bcrypt + token + validator helpers with tests"
```

---

## Task 7: Set up Resend email wrapper

**Files:**
- Create: `src/lib/email.ts`

- [ ] **Step 1: Sign up for Resend (one-time)**

Manual: https://resend.com → sign up → generate an API key → optionally verify a sending domain (or use the resend.dev sandbox domain for dev).

- [ ] **Step 2: Add the API key to `.env.local`**

In `.env.local`:
```
RESEND_API_KEY="re_xxx"
RESEND_FROM_EMAIL="Whetstone <onboarding@resend.dev>"
```

(Use `onboarding@resend.dev` for now if you haven't verified a domain.)

- [ ] **Step 3: Install Resend SDK**

Run: `npm install resend`

- [ ] **Step 4: Write `src/lib/email.ts`**

`src/lib/email.ts`:
```ts
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY not set — emails will fail to send");
}

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM = process.env.RESEND_FROM_EMAIL ?? "Whetstone <onboarding@resend.dev>";
const APP_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${APP_URL}/verify-email/${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Confirm your Whetstone email",
    html: `
      <p>Welcome to Whetstone.</p>
      <p>Click below to confirm your email address:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${APP_URL}/reset-password/${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Whetstone password",
    html: `
      <p>You requested a password reset.</p>
      <p>Click below to choose a new password:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore the email.</p>
    `,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/email.ts
git commit -m "feat: add Resend email wrapper"
```

---

## Task 8: Configure NextAuth v5 with credentials provider + Drizzle adapter

**Files:**
- Modify: `package.json`
- Create: `src/auth.ts`, `src/middleware.ts`, `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Install NextAuth v5 + adapter**

Run:
```
npm install next-auth@beta @auth/drizzle-adapter
```

(NextAuth v5 is published as `next-auth@beta` as of Jan 2026.)

- [ ] **Step 2: Write `src/auth.ts`**

`src/auth.ts`:
```ts
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
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
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    sessionsTable: schema.sessions,
  }),
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
        token.emailVerifiedAt = (user as { emailVerifiedAt: Date | null }).emailVerifiedAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.emailVerifiedAt = (token.emailVerifiedAt as Date | null) ?? null;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Write `src/app/api/auth/[...nextauth]/route.ts`**

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
export { GET, POST } from "@/auth";
```

Wait — NextAuth v5 exports `handlers` not `GET`/`POST`. Correct version:

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Write `src/middleware.ts`**

`src/middleware.ts`:
```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const path = req.nextUrl.pathname;

  // Routes that require auth
  const needsAuth = path.startsWith("/dashboard") || path.startsWith("/today");
  if (needsAuth && !isAuthed) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/today/:path*"],
};
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/auth.ts src/middleware.ts src/app/api/
git commit -m "feat: configure NextAuth v5 credentials + JWT sessions"
```

---

## Task 9: Build the signup flow (server action + form + page)

**Files:**
- Create: `src/server-actions/auth.ts`, `src/components/auth/signup-form.tsx`, `src/app/signup/page.tsx`

- [ ] **Step 1: Install React Hook Form + resolver**

Run:
```
npm install react-hook-form @hookform/resolvers
```

- [ ] **Step 2: Write the signup server action**

`src/server-actions/auth.ts`:
```ts
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

  // Idempotent-ish: if email already exists, return generic error
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

  // Seed preferences row
  await db.insert(schema.userPreferences).values({ userId: user.id });

  // Generate + store verification token, then send the email
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
```

- [ ] **Step 3: Write the signup form component**

`src/components/auth/signup-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signupSchema, type SignupInput } from "@/lib/validators";
import { signup } from "@/server-actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = (data: SignupInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signup(data);
      if (result.ok) {
        router.push("/verify-email");
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} autoComplete="name" />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} autoComplete="email" />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} autoComplete="new-password" />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Write the signup page**

`src/app/signup/page.tsx`:
```tsx
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Create your Whetstone account</h1>
          <p className="text-sm text-gray-600 mt-1">Daily check-ins, shared with your group.</p>
        </div>
        <SignupForm />
        <p className="text-sm text-gray-600">
          Already have an account? <Link href="/signin" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Verify the page renders**

Run: `npm run dev`, visit http://localhost:3000/signup.
Expected: form renders with Name, Email, Password fields and a "Sign up" button.

Stop the server.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/server-actions/ src/components/auth/signup-form.tsx src/app/signup/
git commit -m "feat: signup flow (server action + form + page)"
```

---

## Task 10: Build the email verification flow

**Files:**
- Modify: `src/server-actions/auth.ts`
- Create: `src/app/verify-email/page.tsx`, `src/app/verify-email/[token]/page.tsx`

- [ ] **Step 1: Add the verify server action**

Append to `src/server-actions/auth.ts`:
```ts
import { and, isNull, gt } from "drizzle-orm";

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
```

Now update the imports at the top of `src/server-actions/auth.ts`. The existing `import { eq } from "drizzle-orm";` line becomes:

```ts
import { and, eq, gt, isNull } from "drizzle-orm";
```

Final import block at the top of `src/server-actions/auth.ts` after this task:
```ts
"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { signupSchema, type SignupInput } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { generateToken, addExpiry } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
```

- [ ] **Step 2: Write the "check your email" landing page**

`src/app/verify-email/page.tsx`:
```tsx
export default function VerifyEmailLandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-gray-600">
          We sent you a confirmation link. Click it to finish setting up your account.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Write the verify-token handler page**

`src/app/verify-email/[token]/page.tsx`:
```tsx
import Link from "next/link";
import { verifyEmailToken } from "@/server-actions/auth";

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmailToken(token);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        {result.ok ? (
          <>
            <h1 className="text-2xl font-semibold">Email confirmed</h1>
            <p className="text-gray-600">You can now sign in.</p>
            <Link href="/signin" className="inline-block underline">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Link expired</h1>
            <p className="text-gray-600">{result.error}</p>
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Smoke-test the full signup → verify path**

Run: `npm run dev`. In a browser:
1. Visit `/signup`, create an account with a real email you can check.
2. Submit → should redirect to `/verify-email`.
3. Check the email inbox for the verification link.
4. Click the link → should land on `/verify-email/<token>` and show "Email confirmed".

If the email never arrives, check the Resend dashboard logs for delivery status.

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/server-actions/auth.ts src/app/verify-email/
git commit -m "feat: email verification flow"
```

---

## Task 11: Build the signin flow

**Files:**
- Create: `src/components/auth/signin-form.tsx`, `src/app/signin/page.tsx`

- [ ] **Step 1: Write the signin form**

`src/components/auth/signin-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signinSchema, type SigninInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SigninForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<SigninInput>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = (data: SigninInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setServerError("Invalid email or password.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} autoComplete="email" />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} autoComplete="current-password" />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Wrap layout with NextAuth session provider for client `signIn`**

`signIn` from `next-auth/react` needs a `SessionProvider`. Update `src/app/layout.tsx`:

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whetstone",
  description: "Daily accountability check-ins with your group.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Write the signin page**

`src/app/signin/page.tsx`:
```tsx
import Link from "next/link";
import { SigninForm } from "@/components/auth/signin-form";

export default function SigninPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Sign in to Whetstone</h1>
        </div>
        <SigninForm />
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            New here? <Link href="/signup" className="underline">Create an account</Link>
          </p>
          <p>
            Forgot password? <Link href="/reset-password" className="underline">Reset it</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Smoke-test signin**

Run: `npm run dev`. With your verified account from Task 10:
1. Visit `/signin`, enter credentials.
2. Should redirect to `/dashboard` (which doesn't exist yet — expect a 404; we build it in Task 14).

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/signin-form.tsx src/app/signin/ src/app/layout.tsx
git commit -m "feat: signin flow via NextAuth credentials"
```

---

## Task 12: Build the password reset request flow

**Files:**
- Modify: `src/server-actions/auth.ts`
- Create: `src/components/auth/reset-request-form.tsx`, `src/app/reset-password/page.tsx`

- [ ] **Step 1: Add the reset-request server action**

Update the imports at the top of `src/server-actions/auth.ts`. The two changed lines:

- `import { sendVerificationEmail } from "@/lib/email";` becomes
  `import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";`
- `import { signupSchema, type SignupInput } from "@/lib/validators";` becomes
  `import { signupSchema, type SignupInput, resetRequestSchema, type ResetRequestInput, resetConfirmSchema, type ResetConfirmInput } from "@/lib/validators";`

After those changes, append the new server action to the bottom of `src/server-actions/auth.ts`:

```ts
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
```

- [ ] **Step 2: Write the reset-request form**

`src/components/auth/reset-request-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetRequestSchema, type ResetRequestInput } from "@/lib/validators";
import { requestPasswordReset } from "@/server-actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<ResetRequestInput>({
    resolver: zodResolver(resetRequestSchema),
  });

  const onSubmit = (data: ResetRequestInput) => {
    startTransition(async () => {
      await requestPasswordReset(data);
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="space-y-2">
        <h2 className="font-medium">Check your email</h2>
        <p className="text-sm text-gray-600">
          If an account exists for that address, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} autoComplete="email" />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write the reset-request page**

`src/app/reset-password/page.tsx`:
```tsx
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export default function ResetRequestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-gray-600 mt-1">
            Enter your account email and we'll send you a reset link.
          </p>
        </div>
        <ResetRequestForm />
        <p className="text-sm text-gray-600">
          <Link href="/signin" className="underline">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Smoke-test**

Run: `npm run dev`. Visit `/reset-password`, enter the email from Task 9. Check inbox for the reset email.

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/server-actions/auth.ts src/components/auth/reset-request-form.tsx src/app/reset-password/page.tsx
git commit -m "feat: password reset request flow"
```

---

## Task 13: Build the password reset confirm flow

**Files:**
- Modify: `src/server-actions/auth.ts`
- Create: `src/components/auth/reset-confirm-form.tsx`, `src/app/reset-password/[token]/page.tsx`

- [ ] **Step 1: Add the reset-confirm server action**

Append to `src/server-actions/auth.ts`:
```ts
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
```

- [ ] **Step 2: Write the reset-confirm form**

`src/components/auth/reset-confirm-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { resetConfirmSchema, type ResetConfirmInput } from "@/lib/validators";
import { confirmPasswordReset } from "@/server-actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetConfirmForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<ResetConfirmInput>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: { token },
  });

  const onSubmit = (data: ResetConfirmInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await confirmPasswordReset(data);
      if (result.ok) {
        router.push("/signin");
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("token")} />
      <div className="space-y-1">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" {...register("password")} autoComplete="new-password" />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Set new password"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write the reset-confirm page**

`src/app/reset-password/[token]/page.tsx`:
```tsx
import { ResetConfirmForm } from "@/components/auth/reset-confirm-form";

export default async function ResetConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <ResetConfirmForm token={token} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Smoke-test**

Run: `npm run dev`. Use the reset link from Task 12, set a new password, redirect to signin, sign in with the new password.

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/server-actions/auth.ts src/components/auth/reset-confirm-form.tsx src/app/reset-password/
git commit -m "feat: password reset confirm flow"
```

---

## Task 14: Build the placeholder dashboard

This closes the auth loop: signed-in users land somewhere real after signin. The dashboard becomes the navigation hub in Plan 2; for now it just confirms identity.

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Modify: `src/app/page.tsx` (link the landing CTA)

- [ ] **Step 1: Write the dashboard page**

`src/app/dashboard/page.tsx`:
```tsx
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <main className="min-h-screen p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        <p className="text-gray-600 mt-1">
          {session.user.emailVerifiedAt
            ? "Your email is verified."
            : "Please verify your email — check your inbox for the link we sent."}
        </p>
      </div>

      <div className="border rounded p-4 bg-gray-50">
        <p className="text-sm text-gray-700">
          Groups, templates, and daily entries will live here. (Plans 2–6.)
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Update the landing page with CTAs**

`src/app/page.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold">Whetstone</h1>
        <p className="text-gray-600">
          Daily accountability check-ins, shared with the people who keep you sharp.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify the full loop end-to-end**

Run: `npm run dev`. Walk through:
1. `/` → click "Get started" → `/signup`
2. Create account → `/verify-email`
3. Click email link → `/verify-email/<token>` → "Email confirmed" → click "Go to sign in"
4. `/signin` → enter credentials → `/dashboard` → see your name + verified status
5. Click "Sign out" → back to `/`
6. Try `/dashboard` while signed out → redirected to `/signin` (middleware works)
7. Try the reset flow with a different password and confirm signin works with the new password

If any step breaks, fix and re-test.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/ src/app/page.tsx
git commit -m "feat: placeholder dashboard + landing CTAs"
```

---

## Task 15: Final hygiene — typecheck, lint, run all tests, commit

**Files:**
- Modify: `package.json` (add lint helper if missing)
- Create: `eslint.config.mjs` if needed

- [ ] **Step 1: Add ESLint (optional but recommended)**

Run:
```
npm install -D eslint @eslint/js typescript-eslint eslint-config-next
```

`eslint.config.mjs`:
```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "eslint-config-next";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextPlugin,
  { ignores: [".next/**", "drizzle/**", "node_modules/**"] },
];
```

(If `eslint-config-next` proves finicky, drop it and keep just `js` + `tseslint`. ESLint is a nice-to-have for v1.)

- [ ] **Step 2: Run typecheck + tests + lint**

```
npx tsc --noEmit
npm test
npm run lint
```

All three should succeed. Fix any warnings before continuing.

- [ ] **Step 3: Update `README.md` with run instructions**

Replace `README.md` content with:

```markdown
# Whetstone

A small web app for daily accountability check-ins among trusted groups.

Each member tracks what matters to *them* via a personal template; groups
are the audience for those entries. Templates can be published into a
group's gallery so others can clone them.

## Status

Foundation + Auth shipped. Groups, templates, entries, engagement,
notifications, polish still to come — see `docs/superpowers/plans/`.

## Local development

Prerequisites:
- Node.js 20+
- A Neon Postgres database (free tier at https://neon.tech)
- A Resend API key (free tier at https://resend.com)

Setup:
```bash
cp .env.example .env.local  # then fill in DATABASE_URL, AUTH_SECRET, RESEND_API_KEY
npm install
npm run db:migrate
npm run dev
```

Visit http://localhost:3000.

## Useful scripts

- `npm run dev` — local dev server
- `npm test` — Vitest unit tests
- `npm run db:generate` — generate a new migration from schema changes
- `npm run db:migrate` — apply migrations to the configured DB
- `npm run db:studio` — open Drizzle Studio in the browser

## Architecture

See [`docs/superpowers/specs/2026-05-22-whetstone-design.md`](docs/superpowers/specs/2026-05-22-whetstone-design.md)
for the v1 design.
```

- [ ] **Step 4: Final commit**

```bash
git add README.md package.json package-lock.json eslint.config.mjs
git commit -m "chore: add lint config + update README for foundation+auth"
```

- [ ] **Step 5: Tag this milestone**

```bash
git tag v0.1.0-foundation-auth
```

(No push step — pushing to GitHub happens in Plan 7 (Deploy).)

---

## Done. You should now be able to:

- Visit `/`, sign up, verify your email, sign in, see the dashboard, reset your password, sign back in.
- Have all 13 v1 tables created in Neon (visible in `npm run db:studio`).
- Re-run `npm test` and see green.

Next plan: **Plan 2 — Groups + Templates + Daily Entry**. That's where Whetstone becomes actually useful for a check-in loop.
