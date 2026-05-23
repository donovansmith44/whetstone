import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyGroups } from "@/server-actions/groups";
import { getTodayEntryView } from "@/server-actions/entries";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const groups = await getMyGroups();
  const view = await getTodayEntryView();
  const firstName = session.user.name?.split(" ")[0] ?? session.user.name;

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {/* Greeting */}
        <header className="mb-12 md:mb-16">
          <span className="eyebrow eyebrow-clay">{formatToday()}</span>
          <h1
            className="display mt-3"
            style={{
              fontSize: "clamp(36px, 6.5vw, 64px)",
              lineHeight: 0.96,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
            }}
          >
            Good day,{" "}
            <span
              style={{
                fontStyle: "italic",
                fontWeight: 300,
                color: "var(--color-clay)",
                fontVariationSettings: '"opsz" 144, "SOFT" 100',
              }}
            >
              {firstName}
            </span>
            <span style={{ color: "var(--color-clay)" }}>.</span>
          </h1>
          {!session.user.emailVerifiedAt && (
            <p
              className="mt-4 inline-block px-3 py-1.5"
              style={{
                background: "rgba(168, 127, 48, 0.12)",
                border: "1px solid var(--color-gold)",
                color: "var(--color-ink)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "13px",
              }}
            >
              Verify your email — check your inbox for the link.
            </p>
          )}
        </header>

        <div className="grid md:grid-cols-12 gap-10 md:gap-14">
          {/* Left: today's check-in callout */}
          <section className="md:col-span-7">
            <span className="eyebrow">Today's Practice</span>
            <div
              className="mt-5 p-7 md:p-9"
              style={{
                background: "var(--color-paper-deep)",
                borderTop: "3px solid var(--color-clay)",
                boxShadow: "inset 0 0 0 0.5px var(--color-rule), 0 1px 0 rgba(255, 255, 255, 0.4)",
              }}
            >
              {!view.template ? (
                <>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "26px",
                      lineHeight: 1.1,
                      fontWeight: 500,
                      color: "var(--color-ink)",
                      fontVariationSettings: '"opsz" 36, "SOFT" 30',
                    }}
                  >
                    First, write a few questions you'll answer each day.
                  </h2>
                  <p
                    className="mt-3"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "15px",
                      lineHeight: 1.55,
                      color: "var(--color-ink-soft)",
                    }}
                  >
                    Your template is a small list of prompts — daily update,
                    struggles, what's coming. Three is plenty.
                  </p>
                  <Link href="/templates/new" className="btn-clay mt-6 inline-block">
                    Write your template
                  </Link>
                </>
              ) : view.entry ? (
                <>
                  <div className="rule-ornament" style={{ margin: "0 0 1rem", textAlign: "left" }}>
                    <span style={{ color: "var(--color-clay)" }}>✦</span>
                  </div>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "26px",
                      lineHeight: 1.1,
                      fontWeight: 500,
                      color: "var(--color-ink)",
                      fontVariationSettings: '"opsz" 36, "SOFT" 30',
                    }}
                  >
                    You've written today.
                  </h2>
                  <p
                    className="mt-3"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "15px",
                      lineHeight: 1.55,
                      color: "var(--color-ink-soft)",
                    }}
                  >
                    The day is yours. You can still edit until midnight.
                  </p>
                  <Link
                    href="/today"
                    className="mt-5 inline-block"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "12px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: "var(--color-clay)",
                      borderBottom: "1px solid var(--color-clay-soft)",
                      paddingBottom: "3px",
                    }}
                  >
                    Re-read or edit
                  </Link>
                </>
              ) : (
                <>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "30px",
                      lineHeight: 1.05,
                      fontWeight: 500,
                      color: "var(--color-ink)",
                      fontVariationSettings: '"opsz" 36, "SOFT" 30',
                    }}
                  >
                    Take ten minutes,{" "}
                    <span style={{ fontStyle: "italic", color: "var(--color-clay)" }}>
                      and write the day down.
                    </span>
                  </h2>
                  <Link href="/today" className="btn-clay mt-6 inline-block">
                    Begin today's entry
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* Right: groups index */}
          <aside className="md:col-span-5">
            <div className="flex items-baseline justify-between mb-5">
              <span className="eyebrow">Your Groups</span>
              <Link
                href="/groups/new"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--color-clay)",
                }}
              >
                + New group
              </Link>
            </div>

            {groups.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "15px",
                  lineHeight: 1.55,
                  color: "var(--color-ink-soft)",
                }}
              >
                No groups yet. Create one and invite a friend — or open an
                invite link they sent you.
              </p>
            ) : (
              <ul style={{ borderTop: "1px solid var(--color-rule)" }}>
                {groups.map((g) => (
                  <li
                    key={g.id}
                    style={{
                      borderBottom: "1px solid var(--color-rule)",
                    }}
                  >
                    <Link
                      href={`/g/${g.slug}` as never}
                      className="flex items-baseline justify-between py-3.5 transition-colors hover:bg-[var(--color-paper-deep)]/40"
                      style={{ paddingLeft: "0.5rem", paddingRight: "0.5rem" }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "18px",
                          fontWeight: 500,
                          color: "var(--color-ink)",
                          fontVariationSettings: '"opsz" 24, "SOFT" 30',
                        }}
                      >
                        {g.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "9.5px",
                          letterSpacing: "0.28em",
                          textTransform: "uppercase",
                          color: "var(--color-ink-faint)",
                          fontWeight: 600,
                        }}
                      >
                        {g.role}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/templates"
              className="mt-8 inline-block"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "11px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--color-ink-soft)",
                borderBottom: "1px solid var(--color-rule-strong)",
                paddingBottom: "3px",
              }}
            >
              Your templates →
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}

function formatToday(): string {
  const d = new Date();
  const day = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const date = d.getDate();
  return `${day} · ${month} ${date}`;
}
