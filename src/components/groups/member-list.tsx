import { Button } from "@/components/ui/button";
import { leaveGroup } from "@/server-actions/groups";

type Member = { userId: string; name: string; email: string; role: string; joinedAt: Date };

export function MemberList({
  members,
  currentUserId,
  groupSlug,
  isOwner,
}: {
  members: Member[];
  currentUserId: string;
  groupSlug: string;
  isOwner: boolean;
}) {
  return (
    <div className="space-y-3">
      <ul className="divide-y border rounded">
        {members.map((m) => (
          <li key={m.userId} className="p-3 flex justify-between items-center">
            <div>
              <div className="font-medium">{m.name} {m.userId === currentUserId && <span className="text-xs text-gray-500">(you)</span>}</div>
              <div className="text-sm text-gray-500">{m.email}</div>
            </div>
            <span className="text-xs uppercase tracking-wide text-gray-500">{m.role}</span>
          </li>
        ))}
      </ul>

      {!isOwner && (
        <form action={async () => {
          "use server";
          await leaveGroup(groupSlug);
        }}>
          <Button type="submit" variant="outline">Leave group</Button>
        </form>
      )}
    </div>
  );
}
