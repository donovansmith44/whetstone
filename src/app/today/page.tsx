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

  const { template, entry, prefill, today } = view;
  const initialValues: Record<string, string> = {};
  for (const f of template.fields) initialValues[f.key] = "";
  // Existing entry values
  if (entry) Object.assign(initialValues, entry.values as Record<string, string>);
  // Autocomplete prefill (only if no entry yet)
  if (!entry) Object.assign(initialValues, prefill);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Today — {today}</h1>
        <p className="text-sm text-gray-600">{entry ? "Editing today's entry" : "New entry"}</p>
      </div>
      <EntryForm
        templateId={template.id}
        fields={template.fields.map((f) => ({ key: f.key, label: f.label, prompt: f.prompt, type: f.type }))}
        initialValues={initialValues}
      />
    </main>
  );
}
