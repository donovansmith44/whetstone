import Link from "next/link";

type Field = { key: string; label: string; type: string };

export function EntryCard({
  userName,
  fields,
  values,
  createdAt,
  slug,
  entryId,
  reactionCount,
  commentCount,
}: {
  userName: string;
  fields: Field[];
  values: Record<string, string>;
  createdAt: Date;
  slug?: string;
  entryId?: string;
  reactionCount?: number;
  commentCount?: number;
}) {
  const hasEngagement = (reactionCount ?? 0) > 0 || (commentCount ?? 0) > 0;
  const engagementParts: string[] = [];
  if ((reactionCount ?? 0) > 0) engagementParts.push(`${reactionCount} reaction${reactionCount === 1 ? "" : "s"}`);
  if ((commentCount ?? 0) > 0) engagementParts.push(`${commentCount} comment${commentCount === 1 ? "" : "s"}`);

  return (
    <article className="border rounded p-4 space-y-3">
      <header className="flex justify-between items-baseline">
        <h3 className="font-medium">{userName}</h3>
        <time className="text-xs text-gray-500">{new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </header>
      <div className="space-y-2">
        {fields.map((f) => {
          const v = values[f.key];
          if (!v) return null;
          return (
            <div key={f.key}>
              <div className="text-xs uppercase tracking-wide text-gray-500">{f.label}</div>
              <div className="whitespace-pre-wrap">{v}</div>
            </div>
          );
        })}
      </div>
      {(slug && entryId) && (
        <footer className="flex items-center justify-between pt-1">
          {hasEngagement ? (
            <span className="text-xs text-gray-500">{engagementParts.join(" · ")}</span>
          ) : (
            <span />
          )}
          <Link href={`/g/${slug}/entries/${entryId}`} className="text-xs text-blue-600 hover:underline">
            View entry →
          </Link>
        </footer>
      )}
    </article>
  );
}
