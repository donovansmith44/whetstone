import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  listMyTemplates,
  getActiveTemplate,
  publishTemplateToGroup,
  setActiveTemplate,
} from "@/server-actions/templates";
import { getMyGroups } from "@/server-actions/groups";

export default async function MyTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const templates = await listMyTemplates();
  const active = await getActiveTemplate();
  const myGroups = await getMyGroups();

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-5 mb-10 border-b" style={{ borderColor: "var(--color-rule-strong)" }}>
          <div>
            <span className="eyebrow eyebrow-clay">Your Practice</span>
            <h1
              className="mt-2 display"
              style={{
                fontSize: "clamp(34px, 5vw, 52px)",
                lineHeight: 0.98,
                fontWeight: 400,
                fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
              }}
            >
              Templates
            </h1>
            <p
              className="mt-2 max-w-md"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "15px",
                lineHeight: 1.5,
                color: "var(--color-ink-soft)",
              }}
            >
              The questions you'll answer each day. Keep the active one fresh — edit it when life shifts.
            </p>
          </div>
          <Link href="/templates/new" className="btn-clay">+ New template</Link>
        </header>

        {templates.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              background: "var(--color-paper-deep)",
              boxShadow: "inset 0 0 0 0.5px var(--color-rule)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "17px",
                color: "var(--color-ink-soft)",
                lineHeight: 1.55,
              }}
            >
              No templates yet. Write your first one.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {templates.map((t) => {
              const isActive = active?.id === t.id;
              return (
                <li
                  key={t.id}
                  className="p-6"
                  style={{
                    background: isActive ? "var(--color-paper-deep)" : "transparent",
                    borderLeft: isActive
                      ? "3px solid var(--color-clay)"
                      : "1px solid var(--color-rule)",
                    boxShadow: isActive ? "inset 0 0 0 0.5px var(--color-rule)" : "none",
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3">
                        <h3
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "22px",
                            fontWeight: 500,
                            color: "var(--color-ink)",
                            fontVariationSettings: '"opsz" 24, "SOFT" 30',
                          }}
                        >
                          {t.name}
                        </h3>
                        {isActive && (
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: "9.5px",
                              letterSpacing: "0.32em",
                              textTransform: "uppercase",
                              color: "var(--color-clay)",
                              fontWeight: 700,
                            }}
                          >
                            ✦ Active
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p
                          className="mt-1"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontStyle: "italic",
                            fontSize: "14.5px",
                            color: "var(--color-ink-soft)",
                            lineHeight: 1.5,
                          }}
                        >
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <form action={async () => { "use server"; await setActiveTemplate(t.id); }}>
                          <button
                            type="submit"
                            className="px-3 py-1.5"
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: "10.5px",
                              letterSpacing: "0.22em",
                              textTransform: "uppercase",
                              fontWeight: 600,
                              color: "var(--color-clay)",
                              border: "1px solid var(--color-clay-soft)",
                            }}
                          >
                            Make active
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/templates/${t.id}/edit`}
                        className="px-3 py-1.5"
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "10.5px",
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          color: "var(--color-ink-soft)",
                        }}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>

                  {myGroups.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px dashed var(--color-rule)" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "10px",
                          letterSpacing: "0.28em",
                          textTransform: "uppercase",
                          color: "var(--color-ink-faint)",
                          fontWeight: 600,
                        }}
                      >
                        Share to →
                      </span>
                      {myGroups.map((g) => (
                        <form
                          key={g.id}
                          action={async () => { "use server"; await publishTemplateToGroup(t.id, g.id); }}
                        >
                          <button
                            type="submit"
                            className="px-2.5 py-1"
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "13px",
                              fontStyle: "italic",
                              color: "var(--color-ink)",
                              border: "1px solid var(--color-rule-strong)",
                            }}
                          >
                            {g.name}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
