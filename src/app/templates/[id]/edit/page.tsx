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
