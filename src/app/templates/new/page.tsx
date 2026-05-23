import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TemplateForm } from "@/components/templates/template-form";

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ publishTo?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { publishTo } = await searchParams;
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New template</h1>
      {publishTo && (
        <p className="text-sm text-gray-600">
          Will be published to <strong>{publishTo}</strong> after creation.
        </p>
      )}
      <TemplateForm mode="create" publishToSlug={publishTo} />
    </main>
  );
}
