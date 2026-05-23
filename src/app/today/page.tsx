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
      <main className="min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-20 md:py-28 text-center space-y-6">
          <span className="eyebrow eyebrow-clay">A First Step</span>
          <h1
            className="display"
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              lineHeight: 1.05,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 30',
            }}
          >
            You'll need a template{" "}
            <span style={{ fontStyle: "italic", color: "var(--color-clay)" }}>first.</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "17px",
              lineHeight: 1.55,
              color: "var(--color-ink-soft)",
            }}
          >
            A template is your daily list of prompts. Make a small one — you
            can always change it.
          </p>
          <Link href="/templates/new" className="btn-clay inline-block">
            Write your template
          </Link>
        </div>
      </main>
    );
  }

  const { template, entry, prefill, today } = view;
  const initialValues: Record<string, string> = {};
  for (const f of template.fields) initialValues[f.key] = "";
  if (entry) Object.assign(initialValues, entry.values as Record<string, string>);
  if (!entry) Object.assign(initialValues, prefill);

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {/* Header — date + state */}
        <header className="text-center mb-10 md:mb-14">
          <span className="eyebrow eyebrow-clay">
            {entry ? "Editing" : "New Entry"}
          </span>
          <h1
            className="display mt-3"
            style={{
              fontSize: "clamp(40px, 6.5vw, 72px)",
              lineHeight: 0.96,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
            }}
          >
            {formatPretty(today)}
            <span style={{ color: "var(--color-clay)" }}>.</span>
          </h1>
          <div className="rule-ornament" style={{ marginTop: "1.25rem" }} />
        </header>

        <EntryForm
          templateId={template.id}
          fields={template.fields.map((f) => ({
            key: f.key,
            label: f.label,
            prompt: f.prompt,
            type: f.type,
          }))}
          initialValues={initialValues}
        />
      </div>
    </main>
  );
}

function formatPretty(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.toLocaleDateString("en-US", { weekday: "long" });
  const month = dt.toLocaleDateString("en-US", { month: "long" });
  return `${day}, ${month} ${d}`;
}
