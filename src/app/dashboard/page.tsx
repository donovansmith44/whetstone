import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getMyGroups } from "@/server-actions/groups";
import { getTodayEntryView } from "@/server-actions/entries";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const groups = await getMyGroups();
  const view = await getTodayEntryView();

  return (
    <main className="min-h-screen p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        {!session.user.emailVerifiedAt && (
          <p className="text-amber-700 mt-1 text-sm">Please verify your email — check your inbox.</p>
        )}
      </div>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Today's check-in</h2>
        {!view.template ? (
          <p className="text-sm text-gray-600">
            <Link href="/templates/new" className="underline">Create your template</Link> to start checking in.
          </p>
        ) : view.entry ? (
          <p className="text-sm text-green-700">You've checked in today.{" "}
            <Link href="/today" className="underline">Edit</Link>
          </p>
        ) : (
          <p className="text-sm">
            <Link href="/today" className="underline font-medium">Check in for today →</Link>
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-medium">My groups</h2>
          <Button asChild size="sm"><Link href="/groups/new">+ New group</Link></Button>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-600">You aren't in any groups yet. Create one or accept an invite link.</p>
        ) : (
          <ul className="divide-y border rounded">
            {groups.map((g) => (
              <li key={g.id} className="p-3">
                <Link href={`/g/${g.slug}`} className="font-medium hover:underline">{g.name}</Link>
                <span className="text-xs text-gray-500 ml-2">{g.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Button asChild variant="outline" size="sm"><Link href="/templates">My templates</Link></Button>
      </section>

    </main>
  );
}
