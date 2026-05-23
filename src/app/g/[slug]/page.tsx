import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroupBySlug } from "@/server-actions/groups";
import { getGroupFeedForDate, getGroupHistoryDates } from "@/server-actions/entries";
import { todayInTimezone } from "@/lib/dates";
import { EntryCard } from "@/components/entries/entry-card";

export default async function GroupFeedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");

  const today = todayInTimezone("America/New_York");
  const todayEntries = await getGroupFeedForDate(group.id, today);
  const historyDates = await getGroupHistoryDates(group.id, 14);
  const historyDays = await Promise.all(
    historyDates
      .filter((d) => d !== today)
      .slice(0, 7)
      .map(async (d) => ({ date: d, entries: await getGroupFeedForDate(group.id, d) })),
  );

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {/* Group masthead */}
        <header className="mb-12">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b" style={{ borderColor: "var(--color-rule-strong)" }}>
            <div>
              <span className="eyebrow eyebrow-clay">Group · {group.role === "owner" ? "Keeper" : "Member"}</span>
              <h1
                className="mt-2 display"
                style={{
                  fontSize: "clamp(34px, 5vw, 52px)",
                  lineHeight: 0.98,
                  fontWeight: 400,
                  fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
                }}
              >
                {group.name}
              </h1>
              {group.description && (
                <p
                  className="mt-2 max-w-xl"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "15px",
                    lineHeight: 1.5,
                    color: "var(--color-ink-soft)",
                  }}
                >
                  {group.description}
                </p>
              )}
            </div>
            <nav className="flex flex-wrap items-center gap-1">
              <FeedLink href={`/g/${slug}/templates`}>Templates</FeedLink>
              <FeedDot />
              <FeedLink href={`/templates/new?publishTo=${slug}`}>+ Template</FeedLink>
              <FeedDot />
              <FeedLink href={`/g/${slug}/invite`}>Invite</FeedLink>
              <FeedDot />
              <FeedLink href={`/g/${slug}/settings`}>Settings</FeedLink>
            </nav>
          </div>
        </header>

        {/* Today */}
        <section className="mb-14">
          <DayHeading label="Today" date={today} accent />
          {todayEntries.length === 0 ? (
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
                No one's written today yet.
              </p>
              <Link
                href="/today"
                className="mt-4 inline-block"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--color-clay)",
                  borderBottom: "1px solid var(--color-clay-soft)",
                  paddingBottom: "3px",
                }}
              >
                Be the first →
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {todayEntries.map((e) => (
                <EntryCard
                  key={e.id}
                  userName={e.userName}
                  fields={e.fields}
                  values={e.values}
                  createdAt={e.createdAt}
                  slug={slug}
                  entryId={e.id}
                  reactionCount={e.reactionCount}
                  commentCount={e.commentCount}
                />
              ))}
            </div>
          )}
        </section>

        {/* History */}
        {historyDays.length > 0 && (
          <section>
            <div className="rule-ornament" />
            <h2
              className="mb-8 text-center"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "22px",
                color: "var(--color-ink-soft)",
                fontWeight: 400,
                fontVariationSettings: '"opsz" 24, "SOFT" 100',
              }}
            >
              The week behind
            </h2>
            <div className="space-y-12">
              {historyDays.map((day) => (
                <div key={day.date}>
                  <DayHeading label="" date={day.date} />
                  <div className="space-y-4">
                    {day.entries.map((e) => (
                      <EntryCard
                        key={e.id}
                        userName={e.userName}
                        fields={e.fields}
                        values={e.values}
                        createdAt={e.createdAt}
                        slug={slug}
                        entryId={e.id}
                        reactionCount={e.reactionCount}
                        commentCount={e.commentCount}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function DayHeading({ label, date, accent = false }: { label: string; date: string; accent?: boolean }) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
  const month = dt.toLocaleDateString("en-US", { month: "long" });
  return (
    <div className="flex items-baseline gap-3 mb-5">
      {label && (
        <span
          className="eyebrow"
          style={{ color: accent ? "var(--color-clay)" : "var(--color-ink-faint)" }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "18px",
          color: "var(--color-ink-soft)",
          fontWeight: 400,
          fontVariationSettings: '"opsz" 24, "SOFT" 100',
        }}
      >
        {weekday}, {month} {d}
      </span>
      <span className="flex-1" style={{ borderTop: "1px solid var(--color-rule)", marginBottom: "8px" }} />
    </div>
  );
}

function FeedLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as never}
      className="px-2 py-1"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "10.5px",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: "var(--color-ink-soft)",
      }}
    >
      {children}
    </Link>
  );
}

function FeedDot() {
  return (
    <span aria-hidden style={{ color: "var(--color-rule-strong)", fontSize: "10px" }}>·</span>
  );
}
