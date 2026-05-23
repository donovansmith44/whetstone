"use client";
import { useState, useTransition } from "react";
import { addComment, deleteComment } from "@/server-actions/engagement";

type Comment = { id: string; userId: string; userName: string; body: string; createdAt: Date };

export function Comments({
  entryId,
  comments,
  currentUserId,
  entryOwnerId,
}: {
  entryId: string;
  comments: Comment[];
  currentUserId: string;
  entryOwnerId: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const post = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await addComment(entryId, body);
      if (r.ok) setBody("");
    });
  };

  return (
    <div>
      <span
        className="block mb-5"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "10px",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "var(--color-ink-faint)",
          fontWeight: 600,
        }}
      >
        Margin notes · {comments.length}
      </span>

      {comments.length > 0 && (
        <ul className="space-y-5 mb-6">
          {comments.map((c) => {
            const canDelete = c.userId === currentUserId || entryOwnerId === currentUserId;
            const initials = c.userName
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <li
                key={c.id}
                className="relative pl-12"
                style={{
                  paddingTop: "4px",
                }}
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-0 inline-flex items-center justify-center"
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "var(--color-paper-deep)",
                    border: "1px solid var(--color-rule-strong)",
                    color: "var(--color-ink-soft)",
                    fontFamily: "var(--font-display)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  {initials}
                </span>
                <div className="flex items-baseline justify-between mb-1">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--color-ink)",
                    }}
                  >
                    {c.userName}
                    <span
                      className="ml-2"
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "10px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--color-ink-faint)",
                        fontWeight: 600,
                      }}
                    >
                      {timeAgo(c.createdAt)}
                    </span>
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => startTransition(async () => { await deleteComment(c.id); })}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "10px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--color-ink-faint)",
                        fontWeight: 600,
                      }}
                      className="hover:!text-[var(--color-clay-deep)]"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "15.5px",
                    lineHeight: 1.55,
                    color: "var(--color-ink)",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-4 border-t" style={{ borderColor: "var(--color-rule)" }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a note in the margin…"
          style={{
            display: "block",
            width: "100%",
            padding: "0.75rem 0.5rem",
            background: "transparent",
            border: 0,
            borderBottom: "1.5px solid var(--color-rule-strong)",
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            lineHeight: 1.5,
            color: "var(--color-ink)",
            outline: "none",
            resize: "vertical",
          }}
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={post}
            disabled={pending || !body.trim()}
            className="btn-clay"
            style={{ opacity: !body.trim() ? 0.4 : 1 }}
          >
            {pending ? "Posting …" : "Leave note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(d: Date): string {
  const date = new Date(d);
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
