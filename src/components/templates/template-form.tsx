"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { templateSchema, type TemplateInput } from "@/lib/validators";
import { createTemplate, updateTemplate } from "@/server-actions/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldBuilder } from "./field-builder";

const STARTER_FIELDS: TemplateInput["fields"] = [
  { key: "daily_update", label: "Daily Update", prompt: "What happened today?", type: "textarea", order: 0 },
  { key: "struggles_today", label: "Struggles Today", prompt: "What did you wrestle with?", type: "textarea", order: 1, autocompleteFromFieldKey: "anticipated_struggles" },
  { key: "anticipated_struggles", label: "Anticipated Struggles Upcoming", prompt: "What's likely to test you tomorrow?", type: "textarea", order: 2 },
];

export function TemplateForm({
  mode,
  initial,
  templateId,
}: {
  mode: "create" | "edit";
  initial?: TemplateInput;
  templateId?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: initial ?? { name: "Daily Check-in", description: "", fields: STARTER_FIELDS },
  });

  const onSubmit = (data: TemplateInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = mode === "create"
        ? await createTemplate(data)
        : await updateTemplate(templateId!, data);
      if (result.ok) router.push("/templates" as never);
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Template name</Label>
        <Input {...form.register("name")} />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Input {...form.register("description")} />
      </div>
      <FieldBuilder control={form.control} register={form.register} errors={form.formState.errors} />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : (mode === "create" ? "Create template" : "Save (new version)")}
      </Button>
    </form>
  );
}
