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
  const filledFields = fields.filter((f) => values[f.key]);
  const firstField = filledFields[0];
  const restFields = filledFields.slice(1);
  const time = new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const initials = userName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <article
      className="relative"
      style={{
        background: "var(--color-paper-deep)",
        boxShadow:
          "inset 0 0 0 0.5px var(--color-rule), 0 1px 0 rgba(255, 255, 255, 0.4)",
        padding: "1.5rem 1.75rem 1.25rem",
      }}
    >
      {/* Author line: monogram + name, hairline above */}
      <header className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: "var(--color-rule)" }}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex items-center justify-center"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "var(--color-clay)",
              color: "var(--color-paper)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 14, "SOFT" 30',
            }}
          >
            {initials}
          </span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 500,
                color: "var(--color-ink)",
                lineHeight: 1.1,
                fontVariationSettings: '"opsz" 24, "SOFT" 30',
              }}
            >
              {userName}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "10.5px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--color-ink-faint)",
                fontWeight: 600,
                marginTop: "2px",
              }}
            >
              {time}
            </div>
          </div>
        </div>
      </header>

      {/* First field renders with a drop cap, magazine-style */}
      {firstField && (
        <div className="mb-4">
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--color-clay)",
              fontWeight: 600,
              marginBottom: "6px",
            }}
          >
            {firstField.label}
          </div>
          <p
            className="dropcap"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "17px",
              lineHeight: 1.6,
              color: "var(--color-ink)",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {values[firstField.key]}
          </p>
        </div>
      )}

      {/* Rest of fields */}
      {restFields.length > 0 && (
        <div className="space-y-3.5 pt-3" style={{ borderTop: "1px dashed var(--color-rule)" }}>
          {restFields.map((f) => (
            <div key={f.key}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "10px",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "var(--color-ink-faint)",
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
              >
                {f.label}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "15.5px",
                  lineHeight: 1.6,
                  color: "var(--color-ink)",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {values[f.key]}
              </p>
            </div>
          ))}
        </div>
      )}

      {slug && entryId && (
        <footer
          className="flex items-center justify-between mt-5 pt-3"
          style={{ borderTop: "1px solid var(--color-rule)" }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10.5px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--color-ink-faint)",
              fontWeight: 600,
            }}
          >
            {(reactionCount ?? 0) > 0 || (commentCount ?? 0) > 0
              ? [
                  (reactionCount ?? 0) > 0 ? `${reactionCount} reaction${reactionCount === 1 ? "" : "s"}` : null,
                  (commentCount ?? 0) > 0 ? `${commentCount} comment${commentCount === 1 ? "" : "s"}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Quiet — no one's spoken yet"}
          </span>
          <Link
            href={`/g/${slug}/entries/${entryId}` as never}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10.5px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--color-clay)",
              borderBottom: "1px solid var(--color-clay-soft)",
              paddingBottom: "2px",
            }}
          >
            Open →
          </Link>
        </footer>
      )}
    </article>
  );
}
