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
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href={`/templates/new?publishTo=${slug}` as never}>+ Create new template</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/g/${slug}`}>Back to feed</Link>
          </Button>
        </div>
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
