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
