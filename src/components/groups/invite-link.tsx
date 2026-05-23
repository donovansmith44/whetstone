"use client";
import { useState, useTransition } from "react";
import { generateInvite } from "@/server-actions/groups";
import { Button } from "@/components/ui/button";

export function InviteLink({ slug }: { slug: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const result = await generateInvite(slug);
      if (result.ok) {
        setUrl(`${window.location.origin}/invite/${result.data.token}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button onClick={generate} disabled={pending}>
        {pending ? "Generating..." : "Generate invite link"}
      </Button>
      {url && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Share this link (expires in 7 days):</p>
          <code className="block p-2 bg-gray-100 rounded text-sm break-all">{url}</code>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(url)}>
            Copy link
          </Button>
        </div>
      )}
    </div>
  );
}
