import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GroupForm } from "@/components/groups/group-form";

export default async function NewGroupPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return (
    <main className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New group</h1>
      <GroupForm />
    </main>
  );
}
