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
