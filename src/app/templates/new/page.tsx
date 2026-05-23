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
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <header className="mb-10">
          <span className="eyebrow eyebrow-clay">New Template</span>
          <h1
            className="mt-2 display"
            style={{
              fontSize: "clamp(34px, 5vw, 52px)",
              lineHeight: 0.98,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
            }}
          >
            A few questions{" "}
            <span style={{ fontStyle: "italic", color: "var(--color-clay)" }}>to ask yourself</span>
          </h1>
          {publishTo && (
            <p
              className="mt-3"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "15px",
                color: "var(--color-ink-soft)",
              }}
            >
              Will be shared to <strong>{publishTo}</strong> once saved.
            </p>
          )}
        </header>
        <div className="paper p-7 md:p-10">
          <TemplateForm mode="create" publishToSlug={publishTo} />
        </div>
      </div>
    </main>
  );
}
