# Whetstone Plan 2 — Groups + Templates + Daily Entry

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use `- [ ]` checkbox syntax.

**Goal:** Ship the minimum useful product loop. After this plan, two users can: each create a personal template, create + invite into a group, fill out a daily check-in against their own template, and see each other's entries in a shared group feed.

**Architecture:** Builds on Plan 1's Next.js + Drizzle + NextAuth foundation. Adds three server-action modules (groups, templates, entries) and a set of pages that wire them through shadcn forms. Templates remain immutable per the spec (edits create new rows linked via `parent_template_id`).

**Tech Stack:** Same as Plan 1 — no new dependencies expected.

**Spec:** [`../specs/2026-05-22-whetstone-design.md`](../specs/2026-05-22-whetstone-design.md). This plan implements §5.2 (groups), §5.3 (templates — minus the publishing gallery, deferred to Plan 4), §5.4 (daily entry), §5.5 (group feed — minus per-entry detail with comments, deferred to Plan 3).

**Out of scope for this plan** (explicitly):
- Reactions + comments → Plan 3
- Template publishing + gallery + cloning → Plan 4
- Discord webhook notifications + Vercel Cron → Plan 5
- Frontend-design polish pass → Plan 6

---

## File Structure (additions on top of Plan 1)

```
src/
├── lib/
│   ├── dates.ts                            # today-in-user-tz, isPastMidnight
│   └── slugs.ts                            # group-slug generation
│
├── server-actions/
│   ├── groups.ts                           # createGroup, generateInvite, acceptInvite, leaveGroup
│   ├── templates.ts                        # createTemplate, updateTemplate (→ new version),
│   │                                       #   setActiveTemplate, listMyTemplates
│   └── entries.ts                          # getTodayEntry, submitEntry,
│                                           #   getGroupFeed, getMyHistory
│
├── components/
│   ├── groups/
│   │   ├── group-form.tsx                  # name + description + optional webhook
│   │   ├── invite-link.tsx                 # show + copy invite URL
│   │   └── member-list.tsx                 # list members, leave/remove buttons
│   │
│   ├── templates/
│   │   ├── template-form.tsx               # name + description + dynamic field builder
│   │   ├── field-builder.tsx               # add/remove/reorder fields, configure autocomplete
│   │   └── template-card.tsx               # readonly preview
│   │
│   └── entries/
│       ├── entry-form.tsx                  # renders active template fields, autocomplete prefill
│       ├── entry-card.tsx                  # renders one entry in the feed (dynamic fields)
│       └── group-feed-day.tsx              # all entries for one date, grouped by date
│
└── app/
    ├── dashboard/page.tsx                  # (modified) lists my groups + today's check-in status
    ├── today/page.tsx                      # auth-required; renders entry-form
    ├── me/page.tsx                         # my history (calendar of past entries)
    │
    ├── groups/
    │   └── new/page.tsx                    # create group
    │
    ├── g/[slug]/
    │   ├── page.tsx                        # group feed (today + history)
    │   ├── invite/page.tsx                 # invite link page (owners only)
    │   └── settings/page.tsx               # member list, leave/remove
    │
    ├── invite/[token]/page.tsx             # accept invite (signed in) or redirect to signin
    │
    └── templates/
        ├── page.tsx                        # my templates list
        ├── new/page.tsx                    # create new template
        └── [id]/edit/page.tsx              # edit (creates new version)

tests/
├── lib/
│   ├── dates.test.ts
│   └── slugs.test.ts
└── server-actions/
    └── templates.test.ts                   # at minimum, verify-template-edit-creates-new-row
```

**Boundaries:**
- `src/lib/*.ts` — pure functions, no DB or React.
- `src/server-actions/{groups,templates,entries}.ts` — DB-touching server actions; each file owns one resource.
- `src/components/{groups,templates,entries}/*.tsx` — domain UI, calls server actions.
- `src/app/**/page.tsx` — pages assemble components + read session.

---

## Task 1: Date helpers + tests

**Files:** Create `src/lib/dates.ts`, `tests/lib/dates.test.ts`.

- [ ] **Step 1: Failing test**

`tests/lib/dates.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { todayInTimezone, isPastMidnight } from "@/lib/dates";

describe("dates", () => {
  it("todayInTimezone returns YYYY-MM-DD for the given timezone", () => {
    // 2026-05-22 03:30 UTC is still 2026-05-21 in America/New_York (UTC-4)
    const at = new Date("2026-05-22T03:30:00Z");
    expect(todayInTimezone("America/New_York", at)).toBe("2026-05-21");
    expect(todayInTimezone("UTC", at)).toBe("2026-05-22");
  });

  it("isPastMidnight returns true when 'at' is the next day in the tz", () => {
    const entryDate = "2026-05-21";
    const earlyNextDay = new Date("2026-05-22T03:30:00Z"); // still 5/21 in NY
    expect(isPastMidnight(entryDate, "America/New_York", earlyNextDay)).toBe(false);

    const later = new Date("2026-05-22T05:00:00Z"); // now 5/22 in NY
    expect(isPastMidnight(entryDate, "America/New_York", later)).toBe(true);
  });
});
```

- [ ] **Step 2: Implementation**

`src/lib/dates.ts`:
```ts
/** Format a Date as YYYY-MM-DD in the given IANA timezone. */
export function todayInTimezone(tz: string, at: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(at); // en-CA gives YYYY-MM-DD
}

/** True if the current moment is on a calendar date AFTER entryDate in the tz. */
export function isPastMidnight(entryDate: string, tz: string, at: Date = new Date()): boolean {
  return todayInTimezone(tz, at) > entryDate;
}
```

- [ ] **Step 3: Tests pass + commit**

```
npm test -- dates
```

Commit:
```
git add src/lib/dates.ts tests/lib/dates.test.ts
git commit -m "feat: date helpers for timezone-aware entry dates"
```

---

## Task 2: Slug helper

**Files:** Create `src/lib/slugs.ts`, `tests/lib/slugs.test.ts`.

- [ ] **Step 1: Failing test**

`tests/lib/slugs.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { slugify, withDiscriminator } from "@/lib/slugs";

describe("slugs", () => {
  it("lowercases and dashes a name", () => {
    expect(slugify("Iron Sharpens Iron")).toBe("iron-sharpens-iron");
    expect(slugify("Donovan & Sam")).toBe("donovan-sam");
    expect(slugify("  Trim  whitespace  ")).toBe("trim-whitespace");
  });

  it("withDiscriminator appends a short random suffix", () => {
    const a = withDiscriminator("foo");
    const b = withDiscriminator("foo");
    expect(a).toMatch(/^foo-[a-z0-9]{4,8}$/);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Implementation**

`src/lib/slugs.ts`:
```ts
import { randomBytes } from "node:crypto";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function withDiscriminator(base: string, len = 5): string {
  const suffix = randomBytes(8).toString("hex").slice(0, len);
  return `${base}-${suffix}`;
}
```

- [ ] **Step 3: Pass + commit**

```
npm test -- slugs
git add src/lib/slugs.ts tests/lib/slugs.test.ts
git commit -m "feat: slug + discriminator helpers"
```

---

## Task 3: Group server actions

**Files:** Create `src/server-actions/groups.ts`. Also create Zod schemas in `src/lib/validators.ts` (append).

- [ ] **Step 1: Append validators**

In `src/lib/validators.ts`, add to the bottom:
```ts
export const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  discordWebhookUrl: z.string().url().optional().or(z.literal("")),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
```

- [ ] **Step 2: Server actions**

`src/server-actions/groups.ts`:
```ts
"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validators";
import { slugify, withDiscriminator } from "@/lib/slugs";
import { generateToken, addExpiry } from "@/lib/tokens";

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not authenticated");
  return session.user.id;
}

export async function createGroup(input: CreateGroupInput): Promise<Result<{ slug: string }>> {
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const userId = await requireUser();
  const { name, description, discordWebhookUrl } = parsed.data;

  // Try a clean slug first; on conflict, add a discriminator
  let slug = slugify(name);
  const existing = await db.select({ id: schema.groups.id })
    .from(schema.groups).where(eq(schema.groups.slug, slug)).limit(1);
  if (existing.length > 0) slug = withDiscriminator(slug);

  const [group] = await db.insert(schema.groups).values({
    slug,
    name,
    description: description || null,
    discordWebhookUrl: discordWebhookUrl || null,
    ownerId: userId,
  }).returning({ id: schema.groups.id, slug: schema.groups.slug });

  await db.insert(schema.groupMembers).values({
    groupId: group.id, userId, role: "owner",
  });

  revalidatePath("/dashboard");
  return { ok: true, data: { slug: group.slug } };
}

export async function generateInvite(slug: string): Promise<Result<{ token: string }>> {
  const userId = await requireUser();
  const group = await db.select().from(schema.groups)
    .where(eq(schema.groups.slug, slug)).limit(1);
  if (!group[0]) return { ok: false, error: "Group not found" };
  // Only members can invite
  const member = await db.select().from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, group[0].id),
      eq(schema.groupMembers.userId, userId),
    )).limit(1);
  if (!member[0]) return { ok: false, error: "Not a member" };

  const token = generateToken();
  await db.insert(schema.groupInvites).values({
    groupId: group[0].id,
    token,
    expiresAt: addExpiry(7 * 24), // 7 days
    createdBy: userId,
  });
  return { ok: true, data: { token } };
}

export async function acceptInvite(token: string): Promise<Result<{ slug: string }>> {
  const userId = await requireUser();
  const rows = await db.select().from(schema.groupInvites)
    .where(and(
      eq(schema.groupInvites.token, token),
      isNull(schema.groupInvites.usedAt),
      gt(schema.groupInvites.expiresAt, new Date()),
    )).limit(1);
  const invite = rows[0];
  if (!invite) return { ok: false, error: "This invite link is invalid or has expired." };

  // Already a member?
  const existing = await db.select().from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, invite.groupId),
      eq(schema.groupMembers.userId, userId),
    )).limit(1);

  if (existing.length === 0) {
    await db.insert(schema.groupMembers).values({
      groupId: invite.groupId, userId, role: "member",
    });
  }

  await db.update(schema.groupInvites)
    .set({ usedAt: new Date(), usedBy: userId })
    .where(eq(schema.groupInvites.id, invite.id));

  const group = await db.select({ slug: schema.groups.slug })
    .from(schema.groups).where(eq(schema.groups.id, invite.groupId)).limit(1);
  revalidatePath("/dashboard");
  return { ok: true, data: { slug: group[0].slug } };
}

export async function leaveGroup(slug: string): Promise<Result> {
  const userId = await requireUser();
  const group = await db.select({ id: schema.groups.id, ownerId: schema.groups.ownerId })
    .from(schema.groups).where(eq(schema.groups.slug, slug)).limit(1);
  if (!group[0]) return { ok: false, error: "Group not found" };
  if (group[0].ownerId === userId) {
    return { ok: false, error: "Owners cannot leave their own group. Delete the group instead." };
  }
  await db.delete(schema.groupMembers).where(and(
    eq(schema.groupMembers.groupId, group[0].id),
    eq(schema.groupMembers.userId, userId),
  ));
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function getMyGroups() {
  const userId = await requireUser();
  return db.select({
    id: schema.groups.id,
    slug: schema.groups.slug,
    name: schema.groups.name,
    role: schema.groupMembers.role,
  }).from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(eq(schema.groupMembers.userId, userId));
}

export async function getGroupBySlug(slug: string) {
  const userId = await requireUser();
  const rows = await db.select({
    id: schema.groups.id,
    slug: schema.groups.slug,
    name: schema.groups.name,
    description: schema.groups.description,
    ownerId: schema.groups.ownerId,
    role: schema.groupMembers.role,
  }).from(schema.groups)
    .innerJoin(schema.groupMembers, and(
      eq(schema.groupMembers.groupId, schema.groups.id),
      eq(schema.groupMembers.userId, userId),
    ))
    .where(eq(schema.groups.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getGroupMembers(groupId: string) {
  return db.select({
    userId: schema.users.id,
    name: schema.users.name,
    email: schema.users.email,
    role: schema.groupMembers.role,
    joinedAt: schema.groupMembers.joinedAt,
  }).from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
    .where(eq(schema.groupMembers.groupId, groupId));
}
```

- [ ] **Step 3: Typecheck + commit**

```
npx tsc --noEmit
git add src/server-actions/groups.ts src/lib/validators.ts
git commit -m "feat: group server actions (create/invite/accept/leave + queries)"
```

---

## Task 4: Group creation page + form

**Files:** Create `src/components/groups/group-form.tsx`, `src/app/groups/new/page.tsx`.

- [ ] **Step 1: GroupForm component**

`src/components/groups/group-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validators";
import { createGroup } from "@/server-actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GroupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
  });

  const onSubmit = (data: CreateGroupInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createGroup(data);
      if (result.ok) router.push(`/g/${result.data.slug}`);
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Group name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" {...register("description")} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="discordWebhookUrl">Discord webhook URL (optional)</Label>
        <Input id="discordWebhookUrl" {...register("discordWebhookUrl")} placeholder="https://discord.com/api/webhooks/..." />
        {errors.discordWebhookUrl && <p className="text-sm text-red-600">{errors.discordWebhookUrl.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create group"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Page**

`src/app/groups/new/page.tsx`:
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GroupForm } from "@/components/groups/group-form";

export default async function NewGroupPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return (
    <main className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New group</h1>
      <GroupForm />
    </main>
  );
}
```

- [ ] **Step 3: Update middleware to protect `/groups`**

In `src/middleware.ts`, extend the `needsAuth` check:
```ts
const needsAuth =
  path.startsWith("/dashboard") ||
  path.startsWith("/today") ||
  path.startsWith("/groups") ||
  path.startsWith("/g/") ||
  path.startsWith("/templates") ||
  path.startsWith("/me");
```

Also update the `config.matcher`:
```ts
export const config = {
  matcher: ["/dashboard/:path*", "/today/:path*", "/groups/:path*", "/g/:path*", "/templates/:path*", "/me/:path*"],
};
```

- [ ] **Step 4: Build + commit**

```
npx next build
git add src/components/groups/ src/app/groups/ src/middleware.ts
git commit -m "feat: create-group page + form, expand middleware coverage"
```

---

## Task 5: Group invite + accept flow

**Files:** Create `src/components/groups/invite-link.tsx`, `src/app/g/[slug]/invite/page.tsx`, `src/app/invite/[token]/page.tsx`.

- [ ] **Step 1: InviteLink component**

`src/components/groups/invite-link.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { generateInvite } from "@/server-actions/groups";
import { Button } from "@/components/ui/button";

export function InviteLink({ slug }: { slug: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const result = await generateInvite(slug);
      if (result.ok) {
        setUrl(`${window.location.origin}/invite/${result.data.token}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button onClick={generate} disabled={pending}>
        {pending ? "Generating..." : "Generate invite link"}
      </Button>
      {url && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Share this link (expires in 7 days):</p>
          <code className="block p-2 bg-gray-100 rounded text-sm break-all">{url}</code>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(url)}>
            Copy link
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Invite page (owners only)**

`src/app/g/[slug]/invite/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getGroupBySlug } from "@/server-actions/groups";
import { InviteLink } from "@/components/groups/invite-link";

export default async function GroupInvitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");
  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Invite to {group.name}</h1>
      <InviteLink slug={slug} />
    </main>
  );
}
```

- [ ] **Step 3: Accept invite page**

`src/app/invite/[token]/page.tsx`:
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/server-actions/groups";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) {
    // Bounce to signin, preserving the invite token via a return path
    redirect(`/signin?next=/invite/${token}`);
  }
  const result = await acceptInvite(token);
  if (result.ok) redirect(`/g/${result.data.slug}`);
  return (
    <main className="min-h-screen p-6 max-w-md mx-auto text-center space-y-4">
      <h1 className="text-xl font-semibold">Couldn't accept invite</h1>
      <p className="text-gray-600">{result.error}</p>
    </main>
  );
}
```

- [ ] **Step 4: Add `/invite` to the middleware whitelist**

`/invite/[token]` does its own auth check (redirects to signin if needed) — middleware should NOT pre-redirect because that loses the invite token. Add an explicit exclusion to the matcher OR check in middleware:
```ts
// In middleware.ts, before the needsAuth check:
if (path.startsWith("/invite/")) return; // handled in-page
```

- [ ] **Step 5: Build + commit**

```
npx next build
git add src/components/groups/invite-link.tsx src/app/g/[slug]/invite/ src/app/invite/ src/middleware.ts
git commit -m "feat: group invite generation + accept flow"
```

---

## Task 6: Group settings page (member list, leave)

**Files:** Create `src/components/groups/member-list.tsx`, `src/app/g/[slug]/settings/page.tsx`.

- [ ] **Step 1: MemberList component (server component is fine here)**

`src/components/groups/member-list.tsx`:
```tsx
import { Button } from "@/components/ui/button";
import { leaveGroup } from "@/server-actions/groups";

type Member = { userId: string; name: string; email: string; role: string; joinedAt: Date };

export function MemberList({
  members,
  currentUserId,
  groupSlug,
  isOwner,
}: {
  members: Member[];
  currentUserId: string;
  groupSlug: string;
  isOwner: boolean;
}) {
  return (
    <div className="space-y-3">
      <ul className="divide-y border rounded">
        {members.map((m) => (
          <li key={m.userId} className="p-3 flex justify-between items-center">
            <div>
              <div className="font-medium">{m.name} {m.userId === currentUserId && <span className="text-xs text-gray-500">(you)</span>}</div>
              <div className="text-sm text-gray-500">{m.email}</div>
            </div>
            <span className="text-xs uppercase tracking-wide text-gray-500">{m.role}</span>
          </li>
        ))}
      </ul>

      {!isOwner && (
        <form action={async () => {
          "use server";
          await leaveGroup(groupSlug);
        }}>
          <Button type="submit" variant="outline">Leave group</Button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Settings page**

`src/app/g/[slug]/settings/page.tsx`:
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGroupBySlug, getGroupMembers } from "@/server-actions/groups";
import { MemberList } from "@/components/groups/member-list";

export default async function GroupSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");
  const members = await getGroupMembers(group.id);
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{group.name} — Settings</h1>
      <MemberList members={members} currentUserId={session.user.id} groupSlug={slug} isOwner={group.role === "owner"} />
    </main>
  );
}
```

- [ ] **Step 3: Build + commit**

```
npx next build
git add src/components/groups/member-list.tsx src/app/g/[slug]/settings/
git commit -m "feat: group settings page with member list + leave action"
```

---

## Task 7: Template server actions

**Files:** Append validators; create `src/server-actions/templates.ts`; add `tests/server-actions/templates.test.ts`.

- [ ] **Step 1: Append validators**

```ts
// in src/lib/validators.ts
export const templateFieldSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, digits, underscores"),
  label: z.string().min(1).max(80),
  prompt: z.string().max(300).optional(),
  type: z.enum(["text", "textarea", "list", "number"]),
  order: z.number().int().min(0),
  autocompleteFromFieldKey: z.string().optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  fields: z.array(templateFieldSchema).min(1, "Add at least one field"),
});
export type TemplateInput = z.infer<typeof templateSchema>;
```

- [ ] **Step 2: Server actions**

`src/server-actions/templates.ts`:
```ts
"use server";

import { eq, desc } from "drizzle-orm";
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
```

- [ ] **Step 3: Test for the new-version-on-edit invariant**

`tests/server-actions/templates.test.ts`:
```ts
// NOTE: this is a placeholder test that documents the invariant.
// Full DB-integration tests come in a later plan when we have test-DB infra.
// For now, this file just verifies the module imports without errors.
import { describe, it, expect } from "vitest";
import * as templates from "@/server-actions/templates";

describe("templates server actions", () => {
  it("exports the expected surface", () => {
    expect(typeof templates.createTemplate).toBe("function");
    expect(typeof templates.updateTemplate).toBe("function");
    expect(typeof templates.setActiveTemplate).toBe("function");
    expect(typeof templates.listMyTemplates).toBe("function");
    expect(typeof templates.getTemplateWithFields).toBe("function");
    expect(typeof templates.getActiveTemplate).toBe("function");
  });
});
```

- [ ] **Step 4: Pass + commit**

```
npm test
npx tsc --noEmit
git add src/server-actions/templates.ts src/lib/validators.ts tests/server-actions/
git commit -m "feat: template server actions (immutable edits via parent_template_id)"
```

---

## Task 8: Field builder UI

**Files:** Create `src/components/templates/field-builder.tsx`.

- [ ] **Step 1: Component**

`src/components/templates/field-builder.tsx`:
```tsx
"use client";
import { useFieldArray, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateInput } from "@/lib/validators";

export function FieldBuilder({
  control, register, errors,
}: {
  control: Control<TemplateInput>;
  register: UseFormRegister<TemplateInput>;
  errors: FieldErrors<TemplateInput>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "fields" });

  return (
    <div className="space-y-4">
      {fields.map((field, idx) => (
        <div key={field.id} className="border rounded p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Key (machine name)</Label>
              <Input {...register(`fields.${idx}.key`)} placeholder="daily_update" />
              {errors.fields?.[idx]?.key && <p className="text-xs text-red-600">{errors.fields[idx]?.key?.message}</p>}
            </div>
            <div>
              <Label>Label</Label>
              <Input {...register(`fields.${idx}.label`)} placeholder="Daily Update" />
            </div>
          </div>
          <div>
            <Label>Prompt / placeholder</Label>
            <Input {...register(`fields.${idx}.prompt`)} placeholder="What happened today?" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Type</Label>
              <select className="block w-full border rounded px-2 py-1" {...register(`fields.${idx}.type`)}>
                <option value="text">text</option>
                <option value="textarea">textarea</option>
                <option value="list">list</option>
                <option value="number">number</option>
              </select>
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" {...register(`fields.${idx}.order`, { valueAsNumber: true })} defaultValue={idx} />
            </div>
            <div>
              <Label>Autocomplete from key (optional)</Label>
              <Input {...register(`fields.${idx}.autocompleteFromFieldKey`)} placeholder="anticipated_struggles" />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => remove(idx)}>Remove field</Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() =>
        append({ key: "", label: "", prompt: "", type: "text", order: fields.length })
      }>
        + Add field
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add src/components/templates/field-builder.tsx
git commit -m "feat: field builder UI for template forms"
```

---

## Task 9: Template create + edit pages

**Files:** Create `src/components/templates/template-form.tsx`, `src/app/templates/new/page.tsx`, `src/app/templates/[id]/edit/page.tsx`, `src/app/templates/page.tsx`.

- [ ] **Step 1: TemplateForm**

`src/components/templates/template-form.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { templateSchema, type TemplateInput } from "@/lib/validators";
import { createTemplate, updateTemplate } from "@/server-actions/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldBuilder } from "./field-builder";

const STARTER_FIELDS: TemplateInput["fields"] = [
  { key: "daily_update", label: "Daily Update", prompt: "What happened today?", type: "textarea", order: 0 },
  { key: "struggles_today", label: "Struggles Today", prompt: "What did you wrestle with?", type: "textarea", order: 1, autocompleteFromFieldKey: "anticipated_struggles" },
  { key: "anticipated_struggles", label: "Anticipated Struggles Upcoming", prompt: "What's likely to test you tomorrow?", type: "textarea", order: 2 },
];

export function TemplateForm({
  mode,
  initial,
  templateId,
}: {
  mode: "create" | "edit";
  initial?: TemplateInput;
  templateId?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: initial ?? { name: "Daily Check-in", description: "", fields: STARTER_FIELDS },
  });

  const onSubmit = (data: TemplateInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = mode === "create"
        ? await createTemplate(data)
        : await updateTemplate(templateId!, data);
      if (result.ok) router.push("/templates");
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Template name</Label>
        <Input {...form.register("name")} />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Input {...form.register("description")} />
      </div>
      <FieldBuilder control={form.control} register={form.register} errors={form.formState.errors} />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : (mode === "create" ? "Create template" : "Save (new version)")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: New template page**

`src/app/templates/new/page.tsx`:
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TemplateForm } from "@/components/templates/template-form";

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New template</h1>
      <TemplateForm mode="create" />
    </main>
  );
}
```

- [ ] **Step 3: Edit template page**

`src/app/templates/[id]/edit/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTemplateWithFields } from "@/server-actions/templates";
import { TemplateForm } from "@/components/templates/template-form";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const t = await getTemplateWithFields(id);
  if (!t || t.ownerUserId !== session.user.id) redirect("/templates");

  const initial = {
    name: t.name,
    description: t.description ?? "",
    fields: t.fields.map((f) => ({
      key: f.key,
      label: f.label,
      prompt: f.prompt ?? "",
      type: f.type as "text" | "textarea" | "list" | "number",
      order: f.order,
      autocompleteFromFieldKey: f.autocompleteFromFieldKey ?? undefined,
    })),
  };

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Edit template</h1>
      <p className="text-sm text-gray-600">Saving creates a new version — past entries keep their original fields.</p>
      <TemplateForm mode="edit" initial={initial} templateId={id} />
    </main>
  );
}
```

- [ ] **Step 4: My templates list page**

`src/app/templates/page.tsx`:
```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listMyTemplates, getActiveTemplate } from "@/server-actions/templates";
import { setActiveTemplate } from "@/server-actions/templates";
import { Button } from "@/components/ui/button";

export default async function MyTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const templates = await listMyTemplates();
  const active = await getActiveTemplate();

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">My templates</h1>
        <Button asChild><Link href="/templates/new">+ New template</Link></Button>
      </div>
      <ul className="divide-y border rounded">
        {templates.map((t) => (
          <li key={t.id} className="p-3 flex justify-between items-center">
            <div>
              <div className="font-medium">
                {t.name} {active?.id === t.id && <span className="text-xs text-green-600">(active)</span>}
              </div>
              {t.description && <div className="text-sm text-gray-500">{t.description}</div>}
            </div>
            <div className="flex gap-2">
              {active?.id !== t.id && (
                <form action={async () => { "use server"; await setActiveTemplate(t.id); }}>
                  <Button type="submit" variant="outline" size="sm">Set active</Button>
                </form>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/templates/${t.id}/edit`}>Edit</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 5: Build + commit**

```
npx next build
git add src/components/templates/template-form.tsx src/app/templates/
git commit -m "feat: template create/edit/list pages with field builder"
```

---

## Task 10: Entry server actions

**Files:** Create `src/server-actions/entries.ts`.

- [ ] **Step 1: Validators**

```ts
// in src/lib/validators.ts
export const entrySchema = z.object({
  templateId: z.string().uuid(),
  values: z.record(z.string(), z.string()),
});
export type EntryInput = z.infer<typeof entrySchema>;
```

- [ ] **Step 2: Server actions**

`src/server-actions/entries.ts`:
```ts
"use server";

import { and, eq, desc, inArray, gte, lte } from "drizzle-orm";
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
```

- [ ] **Step 3: Typecheck + commit**

```
npx tsc --noEmit
git add src/server-actions/entries.ts src/lib/validators.ts
git commit -m "feat: entry server actions (today view, submit, group feed)"
```

---

## Task 11: Daily entry page + form

**Files:** Create `src/components/entries/entry-form.tsx`, `src/app/today/page.tsx`.

- [ ] **Step 1: EntryForm**

`src/components/entries/entry-form.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { submitEntry } from "@/server-actions/entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Field = { key: string; label: string; prompt: string | null; type: string };

export function EntryForm({
  templateId,
  fields,
  initialValues,
}: {
  templateId: string;
  fields: Field[];
  initialValues: Record<string, string>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm<Record<string, string>>({
    defaultValues: initialValues,
  });

  const onSubmit = (values: Record<string, string>) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitEntry({ templateId, values });
      if (result.ok) router.refresh();
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={f.key}>{f.label}</Label>
          {f.type === "textarea" ? (
            <textarea
              id={f.key}
              {...register(f.key)}
              placeholder={f.prompt ?? ""}
              className="block w-full border rounded p-2 min-h-[100px]"
            />
          ) : (
            <Input id={f.key} {...register(f.key)} type={f.type === "number" ? "number" : "text"} placeholder={f.prompt ?? ""} />
          )}
        </div>
      ))}
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save today's entry"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: /today page**

`src/app/today/page.tsx`:
```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTodayEntryView } from "@/server-actions/entries";
import { EntryForm } from "@/components/entries/entry-form";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const view = await getTodayEntryView();

  if (!view.template) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-semibold">Set up your template first</h1>
        <p className="text-gray-600">You need an active template to check in.</p>
        <Link href="/templates/new" className="underline">Create one →</Link>
      </main>
    );
  }

  const initialValues: Record<string, string> = {};
  for (const f of view.template.fields) initialValues[f.key] = "";
  // Existing entry values
  if (view.entry) Object.assign(initialValues, view.entry.values as Record<string, string>);
  // Autocomplete prefill (only if no entry yet)
  if (!view.entry) Object.assign(initialValues, view.prefill);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Today — {view.today}</h1>
        <p className="text-sm text-gray-600">{view.entry ? "Editing today's entry" : "New entry"}</p>
      </div>
      <EntryForm
        templateId={view.template.id}
        fields={view.template.fields.map((f) => ({ key: f.key, label: f.label, prompt: f.prompt, type: f.type }))}
        initialValues={initialValues}
      />
    </main>
  );
}
```

- [ ] **Step 3: Build + commit**

```
npx next build
git add src/components/entries/entry-form.tsx src/app/today/
git commit -m "feat: /today daily entry page with carry-forward autocomplete"
```

---

## Task 12: Group feed page

**Files:** Create `src/components/entries/entry-card.tsx`, `src/app/g/[slug]/page.tsx`.

- [ ] **Step 1: EntryCard**

`src/components/entries/entry-card.tsx`:
```tsx
type Field = { key: string; label: string; type: string };

export function EntryCard({
  userName,
  fields,
  values,
  createdAt,
}: {
  userName: string;
  fields: Field[];
  values: Record<string, string>;
  createdAt: Date;
}) {
  return (
    <article className="border rounded p-4 space-y-3">
      <header className="flex justify-between items-baseline">
        <h3 className="font-medium">{userName}</h3>
        <time className="text-xs text-gray-500">{new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </header>
      <div className="space-y-2">
        {fields.map((f) => {
          const v = values[f.key];
          if (!v) return null;
          return (
            <div key={f.key}>
              <div className="text-xs uppercase tracking-wide text-gray-500">{f.label}</div>
              <div className="whitespace-pre-wrap">{v}</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Group feed page**

`src/app/g/[slug]/page.tsx`:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroupBySlug } from "@/server-actions/groups";
import { getGroupFeedForDate, getGroupHistoryDates } from "@/server-actions/entries";
import { todayInTimezone } from "@/lib/dates";
import { EntryCard } from "@/components/entries/entry-card";
import { Button } from "@/components/ui/button";

export default async function GroupFeedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");

  // Use the viewer's timezone for "today"
  const today = todayInTimezone("America/New_York"); // TODO: pull user tz from session

  const todayEntries = await getGroupFeedForDate(group.id, today);
  const historyDates = await getGroupHistoryDates(group.id, 14);
  const historyDays = await Promise.all(
    historyDates
      .filter((d) => d !== today)
      .slice(0, 7)
      .map(async (d) => ({ date: d, entries: await getGroupFeedForDate(group.id, d) })),
  );

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/g/${slug}/invite`}>Invite</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/g/${slug}/settings`}>Settings</Link></Button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Today — {today}</h2>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet. <Link href="/today" className="underline">Add yours →</Link></p>
        ) : (
          todayEntries.map((e) => (
            <EntryCard key={e.id} userName={e.userName} fields={e.fields} values={e.values} createdAt={e.createdAt} />
          ))
        )}
      </section>

      {historyDays.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-medium">Earlier this week</h2>
          {historyDays.map((day) => (
            <div key={day.date} className="space-y-3">
              <h3 className="text-sm uppercase tracking-wide text-gray-500">{day.date}</h3>
              {day.entries.map((e) => (
                <EntryCard key={e.id} userName={e.userName} fields={e.fields} values={e.values} createdAt={e.createdAt} />
              ))}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Build + commit**

```
npx next build
git add src/components/entries/entry-card.tsx src/app/g/[slug]/page.tsx
git commit -m "feat: group feed page (today + 7-day history)"
```

---

## Task 13: Dashboard updates

**Files:** Replace `src/app/dashboard/page.tsx`.

- [ ] **Step 1: Updated dashboard**

`src/app/dashboard/page.tsx`:
```tsx
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getMyGroups } from "@/server-actions/groups";
import { getTodayEntryView } from "@/server-actions/entries";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const groups = await getMyGroups();
  const view = await getTodayEntryView();

  return (
    <main className="min-h-screen p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        {!session.user.emailVerifiedAt && (
          <p className="text-amber-700 mt-1 text-sm">Please verify your email — check your inbox.</p>
        )}
      </div>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Today's check-in</h2>
        {!view.template ? (
          <p className="text-sm text-gray-600">
            <Link href="/templates/new" className="underline">Create your template</Link> to start checking in.
          </p>
        ) : view.entry ? (
          <p className="text-sm text-green-700">You've checked in today.{" "}
            <Link href="/today" className="underline">Edit</Link>
          </p>
        ) : (
          <p className="text-sm">
            <Link href="/today" className="underline font-medium">Check in for today →</Link>
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-medium">My groups</h2>
          <Button asChild size="sm"><Link href="/groups/new">+ New group</Link></Button>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-600">You aren't in any groups yet. Create one or accept an invite link.</p>
        ) : (
          <ul className="divide-y border rounded">
            {groups.map((g) => (
              <li key={g.id} className="p-3">
                <Link href={`/g/${g.slug}`} className="font-medium hover:underline">{g.name}</Link>
                <span className="text-xs text-gray-500 ml-2">{g.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Button asChild variant="outline" size="sm"><Link href="/templates">My templates</Link></Button>
      </section>

      <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Build + commit**

```
npx next build
git add src/app/dashboard/page.tsx
git commit -m "feat: dashboard lists groups + shows today's check-in status"
```

---

## Task 14: My history page

**Files:** Create `src/app/me/page.tsx`.

- [ ] **Step 1: Page**

`src/app/me/page.tsx`:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { EntryCard } from "@/components/entries/entry-card";
import { getTemplateWithFields } from "@/server-actions/templates";

export default async function MyHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const rows = await db.select().from(schema.entries)
    .where(eq(schema.entries.userId, session.user.id))
    .orderBy(desc(schema.entries.entryDate)).limit(30);

  const hydrated = await Promise.all(rows.map(async (e) => {
    const tpl = await getTemplateWithFields(e.templateId);
    return {
      id: e.id,
      entryDate: e.entryDate,
      createdAt: e.createdAt,
      fields: tpl?.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })) ?? [],
      values: (e.values as Record<string, string>) ?? {},
    };
  }));

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">My check-ins</h1>
      {hydrated.length === 0 ? (
        <p className="text-gray-600">No entries yet. <Link href="/today" className="underline">Check in today</Link>.</p>
      ) : (
        <ul className="space-y-4">
          {hydrated.map((e) => (
            <li key={e.id}>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{e.entryDate}</div>
              <EntryCard userName={session.user.name ?? "You"} fields={e.fields} values={e.values} createdAt={e.createdAt} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Build + commit**

```
npx next build
git add src/app/me/page.tsx
git commit -m "feat: /me history page"
```

---

## Task 15: First-run onboarding

After successful signup-then-verify, the user lands on `/dashboard` with no template + no groups. The dashboard already nudges them to create a template — but the verify-email landing should also point them at the template flow if they have nothing yet. We do this minimally: after they sign in for the first time, the dashboard's existing prompts handle it. No new pages needed.

The only explicit polish: after signin if user has no active template, redirect to `/templates/new` instead of `/dashboard`.

**Files:** Modify `src/components/auth/signin-form.tsx`.

- [ ] **Step 1: Add a `getOnboardingRedirect` helper**

`src/server-actions/onboarding.ts`:
```ts
"use server";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function getOnboardingRedirect(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) return "/signin";
  const active = await db.select().from(schema.userActiveTemplate)
    .where(eq(schema.userActiveTemplate.userId, session.user.id)).limit(1);
  if (active.length === 0) return "/templates/new";
  return "/dashboard";
}
```

- [ ] **Step 2: Use in signin-form**

In `src/components/auth/signin-form.tsx` `onSubmit`, replace `router.push("/dashboard")` with:
```ts
const { getOnboardingRedirect } = await import("@/server-actions/onboarding");
const dest = await getOnboardingRedirect();
router.push(dest as any); // typedRoutes can't see dynamic destinations
```

(The `as any` is needed because typedRoutes doesn't trust a runtime string. Acceptable; the destinations are all valid routes.)

- [ ] **Step 3: Build + commit**

```
npx next build
git add src/server-actions/onboarding.ts src/components/auth/signin-form.tsx
git commit -m "feat: onboarding redirect — send users without a template to /templates/new"
```

---

## Task 16: Final hygiene

- [ ] **Step 1: Full test + build + lint**

```
npm test          # should still be 14 passing (12 original + 2 new in dates.test.ts and slugs.test.ts) + templates surface test (1 more)
npx tsc --noEmit
npm run lint
npx next build
```

All must pass.

- [ ] **Step 2: Tag**

```
git tag v0.2.0-groups-templates-entries
```

- [ ] **Step 3: Final commit (if README updates needed)**

Update `README.md` Status section to: "Plan 2 (Groups + Templates + Daily Entry) shipped. Engagement, publishing, notifications, polish still to come."

```bash
git add README.md
git commit -m "chore: update README for Plan 2"
git push origin <branch>
git push --tags
```

---

## Done state

After this plan:
- Signed-in users can create a personal template and edit it (edits create new versions; old entries keep their original field structure).
- Users can create groups, generate 7-day invite links, accept invites.
- Users can do a daily check-in against their active template with autocomplete carry-forward from their most recent entry.
- Group feed shows today's entries from all members, plus the last week of history, each entry rendered with the author's template fields.
- Dashboard centralizes: today's check-in status, my groups, link to templates.

What's still missing (later plans):
- Reactions + comments on entries (Plan 3)
- Template publishing + gallery + cloning (Plan 4)
- Discord webhook reminders + new-entry notifications (Plan 5)
- Polished UI design pass via frontend-design (Plan 6)
- Production deploy + first invite (Plan 7)
