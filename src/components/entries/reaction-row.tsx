"use client";
import { useTransition } from "react";
import { toggleReaction } from "@/server-actions/engagement";
import { Button } from "@/components/ui/button";

const KINDS = [
  { kind: "amen" as const, label: "Amen" },
  { kind: "praying" as const, label: "Praying" },
  { kind: "encourage" as const, label: "Encourage" },
  { kind: "you-got-this" as const, label: "You got this" },
];

type Reaction = { userId: string; kind: string };

export function ReactionRow({
  entryId,
  reactions,
  currentUserId,
}: {
  entryId: string;
  reactions: Reaction[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {KINDS.map(({ kind, label }) => {
        const count = reactions.filter((r) => r.kind === kind).length;
        const mine = reactions.some((r) => r.kind === kind && r.userId === currentUserId);
        return (
          <Button
            key={kind}
            variant={mine ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => startTransition(async () => { await toggleReaction(entryId, kind); })}
          >
            {label}{count > 0 && ` ${count}`}
          </Button>
        );
      })}
    </div>
  );
}
