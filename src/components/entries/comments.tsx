"use client";
import { useState, useTransition } from "react";
import { addComment, deleteComment } from "@/server-actions/engagement";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-3">
      <ul className="space-y-2">
        {comments.map((c) => {
          const canDelete = c.userId === currentUserId || entryOwnerId === currentUserId;
          return (
            <li key={c.id} className="border-l-2 border-gray-300 pl-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{c.userName}</span>
                {canDelete && (
                  <button
                    className="text-xs text-gray-500 hover:text-red-600"
                    onClick={() => startTransition(async () => { await deleteComment(c.id); })}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="block flex-1 border rounded p-2 text-sm"
          rows={2}
        />
        <Button onClick={post} disabled={pending || !body.trim()} size="sm">
          {pending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
