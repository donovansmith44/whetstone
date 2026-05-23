"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { submitEntry } from "@/server-actions/entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Field = { key: string; label: string; prompt: string | null; type: string };

export function EntryForm({
  templateId,
  fields,
  initialValues,
}: {
  templateId: string;
  fields: Field[];
  initialValues: Record<string, string>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm<Record<string, string>>({
    defaultValues: initialValues,
  });

  const onSubmit = (values: Record<string, string>) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitEntry({ templateId, values });
      if (result.ok) router.refresh();
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={f.key}>{f.label}</Label>
          {f.type === "textarea" ? (
            <textarea
              id={f.key}
              {...register(f.key)}
              placeholder={f.prompt ?? ""}
              className="block w-full border rounded p-2 min-h-[100px]"
            />
          ) : (
            <Input id={f.key} {...register(f.key)} type={f.type === "number" ? "number" : "text"} placeholder={f.prompt ?? ""} />
          )}
        </div>
      ))}
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save today's entry"}
      </Button>
    </form>
  );
}
