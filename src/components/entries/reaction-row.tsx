"use client";
import { useTransition } from "react";
import { toggleReaction } from "@/server-actions/engagement";

/**
 * Four reactions, each with a distinct typographic personality.
 * Christian-accountability vocabulary, no emoji, no celebration confetti.
 */
const KINDS = [
  {
    kind: "amen" as const,
    label: "Amen",
    weight: 700,
    style: "normal" as const,
    case: "uppercase",
    spacing: "0.18em",
  },
  {
    kind: "praying" as const,
    label: "Praying",
    weight: 400,
    style: "italic" as const,
    case: "none",
    spacing: "0em",
  },
  {
    kind: "encourage" as const,
    label: "Encourage",
    weight: 600,
    style: "normal" as const,
    case: "none",
    spacing: "0.04em",
  },
  {
    kind: "you-got-this" as const,
    label: "You've got this",
    weight: 400,
    style: "italic" as const,
    case: "none",
    spacing: "0em",
  },
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
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="mr-2"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "10px",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "var(--color-ink-faint)",
          fontWeight: 600,
        }}
      >
        Say a word
      </span>
      {KINDS.map(({ kind, label, weight, style, case: textCase, spacing }) => {
        const count = reactions.filter((r) => r.kind === kind).length;
        const mine = reactions.some((r) => r.kind === kind && r.userId === currentUserId);
        return (
          <button
            key={kind}
            disabled={pending}
            onClick={() => startTransition(async () => { await toggleReaction(entryId, kind); })}
            className="transition-all"
            style={{
              padding: "6px 14px",
              border: `1px solid ${mine ? "var(--color-clay)" : "var(--color-rule-strong)"}`,
              background: mine ? "var(--color-clay)" : "transparent",
              color: mine ? "var(--color-paper)" : "var(--color-ink)",
              fontFamily: "var(--font-display)",
              fontStyle: style,
              fontWeight: weight,
              fontSize: "14px",
              letterSpacing: spacing,
              textTransform: textCase as "uppercase" | "none",
              fontVariationSettings: '"opsz" 14, "SOFT" 30',
              cursor: pending ? "wait" : "pointer",
            }}
          >
            {label}
            {count > 0 && (
              <span
                className="ml-2"
                style={{
                  fontSize: "11px",
                  opacity: 0.75,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  letterSpacing: "0",
                  fontStyle: "normal",
                  textTransform: "none",
                }}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
