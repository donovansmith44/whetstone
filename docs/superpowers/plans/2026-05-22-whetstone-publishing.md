# Whetstone Plan 4 — Publishing (Template Gallery)

**Goal:** Group members can publish their template into a group; other members can browse the group's gallery and clone a template as their own (creates a new Template owned by them, with `parent_template_id` set to the source).

**Branch:** `feat/publishing`

## Task 1: Publishing server actions

Append to `src/server-actions/templates.ts`:

```ts
import { revalidatePath } from "next/cache";

export async function publishTemplateToGroup(templateId: string, groupId: string): Promise<Result> {
  const userId = await requireUser();
  // Verify ownership of template
  const t = await db.select().from(schema.templates)
    .where(eq(schema.templates.id, templateId)).limit(1);
  if (!t[0] || t[0].ownerUserId !== userId) return { ok: false, error: "Template not found" };
  // Verify membership in group
  const m = await db.select().from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, groupId),
      eq(schema.groupMembers.userId, userId),
    )).limit(1);
  if (!m[0]) return { ok: false, error: "Not a member of this group" };
  // Idempotent insert (UNIQUE primary key on template_id+group_id)
  await db.insert(schema.templatePublications).values({
    templateId, groupId, publishedBy: userId,
  }).onConflictDoNothing();
  revalidatePath(`/g`);
  return { ok: true, data: undefined };
}

export async function cloneTemplate(sourceTemplateId: string): Promise<Result<{ id: string }>> {
  const userId = await requireUser();
  const source = await getTemplateWithFields(sourceTemplateId);
  if (!source) return { ok: false, error: "Template not found" };

  const [cloned] = await db.insert(schema.templates).values({
    ownerUserId: userId,
    name: source.name,
    description: source.description,
    parentTemplateId: sourceTemplateId,
  }).returning({ id: schema.templates.id });

  for (const f of source.fields) {
    await db.insert(schema.templateFields).values({
      templateId: cloned.id,
      key: f.key, label: f.label, prompt: f.prompt,
      type: f.type, order: f.order,
      autocompleteFromFieldKey: f.autocompleteFromFieldKey,
    });
  }

  // Auto-set active if user has none
  const active = await db.select().from(schema.userActiveTemplate)
    .where(eq(schema.userActiveTemplate.userId, userId)).limit(1);
  if (active.length === 0) {
    await db.insert(schema.userActiveTemplate).values({ userId, templateId: cloned.id });
  }
  revalidatePath("/templates");
  return { ok: true, data: { id: cloned.id } };
}

export async function getPublishedTemplatesForGroup(groupId: string) {
  return db.select({
    templateId: schema.templates.id,
    name: schema.templates.name,
    description: schema.templates.description,
    publishedBy: schema.users.name,
    publishedAt: schema.templatePublications.publishedAt,
  }).from(schema.templatePublications)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templatePublications.templateId))
    .innerJoin(schema.users, eq(schema.users.id, schema.templatePublications.publishedBy))
    .where(eq(schema.templatePublications.groupId, groupId));
}
```

Add imports as needed: `and`, `onConflictDoNothing`-via-Drizzle, etc.

Commit: `feat: template publishing + cloning server actions`

## Task 2: Publish button on /templates list

Modify `src/app/templates/page.tsx`. For each owned template, add a "Publish to group..." button that opens a small dropdown / dialog selecting which of my groups to publish into. Simple form approach: list my groups, one form per group with a "Publish to {name}" button.

For now keep it simple — add a `<form>` per group inline. If aesthetics suffer, defer to Plan 6.

Use `getMyGroups()` from `@/server-actions/groups` to get the user's groups in the server component.

Commit: `feat: publish button on templates list page`

## Task 3: Group template gallery page

`src/app/g/[slug]/templates/page.tsx`:

```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGroupBySlug } from "@/server-actions/groups";
import { getPublishedTemplatesForGroup, getTemplateWithFields, cloneTemplate } from "@/server-actions/templates";
import { Button } from "@/components/ui/button";

export default async function GroupTemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");

  const pubs = await getPublishedTemplatesForGroup(group.id);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{group.name} — Templates</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/g/${slug}`}>Back to feed</Link>
        </Button>
      </header>
      {pubs.length === 0 ? (
        <p className="text-gray-600">No templates published in this group yet.</p>
      ) : (
        <ul className="space-y-4">
          {pubs.map((p) => (
            <PublishedRow key={p.templateId} pub={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

async function PublishedRow({ pub }: { pub: Awaited<ReturnType<typeof getPublishedTemplatesForGroup>>[number] }) {
  const tpl = await getTemplateWithFields(pub.templateId);
  return (
    <li className="border rounded p-4 space-y-3">
      <div>
        <h3 className="font-medium">{pub.name}</h3>
        <p className="text-sm text-gray-500">
          Published by {pub.publishedBy} on {new Date(pub.publishedAt).toLocaleDateString()}
        </p>
        {pub.description && <p className="text-sm mt-1">{pub.description}</p>}
      </div>
      <ul className="text-sm text-gray-700 space-y-1">
        {tpl?.fields.map((f) => (
          <li key={f.key}>· {f.label} <span className="text-gray-400">({f.type})</span></li>
        ))}
      </ul>
      <form action={async () => {
        "use server";
        await cloneTemplate(pub.templateId);
      }}>
        <Button type="submit" variant="outline" size="sm">Use as mine</Button>
      </form>
    </li>
  );
}
```

Add a "Templates" link in the group feed header (`src/app/g/[slug]/page.tsx`) pointing at `/g/[slug]/templates`.

Commit: `feat: group template gallery + clone flow`

## Done state

- Owners can publish any of their templates into any group they're a member of
- Group templates page shows the gallery, with field previews + "Use as mine" clone button
- Cloning creates a new Template owned by the user with `parent_template_id` set
- If the user has no active template, the clone becomes active

## Final

```
git tag v0.4.0-publishing
git push origin feat/publishing
git push --tags
git checkout master
git merge --no-ff feat/publishing -m "Merge feat/publishing into master

Plan 4 shipped: template publishing + cloning + group gallery.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git branch -d feat/publishing
```

(Master push from controller; classifier blocks subagent push to default branch.)
