import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroupBySlug } from "@/server-actions/groups";
import { getGroupFeedForDate, getGroupHistoryDates } from "@/server-actions/entries";
import { todayInTimezone } from "@/lib/dates";
import { EntryCard } from "@/components/entries/entry-card";
import { Button } from "@/components/ui/button";

export default async function GroupFeedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const group = await getGroupBySlug(slug);
  if (!group) redirect("/dashboard");

  // Use the viewer's timezone for "today"
  const today = todayInTimezone("America/New_York"); // TODO: pull user tz from session

  const todayEntries = await getGroupFeedForDate(group.id, today);
  const historyDates = await getGroupHistoryDates(group.id, 14);
  const historyDays = await Promise.all(
    historyDates
      .filter((d) => d !== today)
      .slice(0, 7)
      .map(async (d) => ({ date: d, entries: await getGroupFeedForDate(group.id, d) })),
  );

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/g/${slug}/invite`}>Invite</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/g/${slug}/settings`}>Settings</Link></Button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Today — {today}</h2>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet. <Link href="/today" className="underline">Add yours →</Link></p>
        ) : (
          todayEntries.map((e) => (
            <EntryCard key={e.id} userName={e.userName} fields={e.fields} values={e.values} createdAt={e.createdAt} slug={slug} entryId={e.id} reactionCount={e.reactionCount} commentCount={e.commentCount} />
          ))
        )}
      </section>

      {historyDays.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-medium">Earlier this week</h2>
          {historyDays.map((day) => (
            <div key={day.date} className="space-y-3">
              <h3 className="text-sm uppercase tracking-wide text-gray-500">{day.date}</h3>
              {day.entries.map((e) => (
                <EntryCard key={e.id} userName={e.userName} fields={e.fields} values={e.values} createdAt={e.createdAt} slug={slug} entryId={e.id} reactionCount={e.reactionCount} commentCount={e.commentCount} />
              ))}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
