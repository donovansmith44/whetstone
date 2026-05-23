import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyHistory } from "@/server-actions/entries";
import { EntryCard } from "@/components/entries/entry-card";

export default async function MyHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const entries = await getMyHistory(30);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <header className="flex justify-between items-baseline">
        <h1 className="text-2xl font-semibold">My history</h1>
        <Link href="/dashboard" className="text-sm underline text-gray-500">
          ← Dashboard
        </Link>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">
          No entries yet.{" "}
          <Link href="/today" className="underline">
            Check in today →
          </Link>
        </p>
      ) : (
        <section className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                {e.entryDate}
              </p>
              <EntryCard
                userName={session.user!.name ?? "Me"}
                fields={e.fields}
                values={e.values}
                createdAt={e.createdAt}
              />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
