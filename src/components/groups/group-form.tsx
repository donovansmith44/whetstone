"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validators";
import { createGroup } from "@/server-actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GroupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
  });

  const onSubmit = (data: CreateGroupInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createGroup(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (result.ok) router.push(`/g/${result.data.slug}` as never); // /g/[slug]/page.tsx arrives in a later task
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Group name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" {...register("description")} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="discordWebhookUrl">Discord webhook URL (optional)</Label>
        <Input id="discordWebhookUrl" {...register("discordWebhookUrl")} placeholder="https://discord.com/api/webhooks/..." />
        {errors.discordWebhookUrl && <p className="text-sm text-red-600">{errors.discordWebhookUrl.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create group"}
      </Button>
    </form>
  );
}
