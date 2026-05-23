"use client";
import { useFieldArray, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateInput } from "@/lib/validators";

export function FieldBuilder({
  control, register, errors,
}: {
  control: Control<TemplateInput>;
  register: UseFormRegister<TemplateInput>;
  errors: FieldErrors<TemplateInput>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "fields" });

  return (
    <div className="space-y-4">
      {fields.map((field, idx) => (
        <div key={field.id} className="border rounded p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Key (machine name)</Label>
              <Input {...register(`fields.${idx}.key`)} placeholder="daily_update" />
              {errors.fields?.[idx]?.key && <p className="text-xs text-red-600">{errors.fields[idx]?.key?.message}</p>}
            </div>
            <div>
              <Label>Label</Label>
              <Input {...register(`fields.${idx}.label`)} placeholder="Daily Update" />
            </div>
          </div>
          <div>
            <Label>Prompt / placeholder</Label>
            <Input {...register(`fields.${idx}.prompt`)} placeholder="What happened today?" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Type</Label>
              <select className="block w-full border rounded px-2 py-1" {...register(`fields.${idx}.type`)}>
                <option value="text">text</option>
                <option value="textarea">textarea</option>
                <option value="list">list</option>
                <option value="number">number</option>
              </select>
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" {...register(`fields.${idx}.order`, { valueAsNumber: true })} defaultValue={idx} />
            </div>
            <div>
              <Label>Autocomplete from key (optional)</Label>
              <Input {...register(`fields.${idx}.autocompleteFromFieldKey`)} placeholder="anticipated_struggles" />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => remove(idx)}>Remove field</Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() =>
        append({ key: "", label: "", prompt: "", type: "text", order: fields.length })
      }>
        + Add field
      </Button>
    </div>
  );
}
