"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { submitEntry } from "@/server-actions/entries";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
      {fields.map((f, idx) => (
        <section key={f.key} className="relative">
          {/* Numbered ornament */}
          <div
            aria-hidden
            className="absolute -left-2 md:-left-12 top-0"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "32px",
              color: "var(--color-clay-soft)",
              opacity: 0.5,
              fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1',
              lineHeight: 1,
            }}
          >
            {romanize(idx + 1)}.
          </div>

          <div className="md:pl-0">
            <label
              htmlFor={f.key}
              className="block"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                fontWeight: 500,
                lineHeight: 1.3,
                color: "var(--color-ink)",
                fontVariationSettings: '"opsz" 24, "SOFT" 30',
              }}
            >
              {f.label}
            </label>
            {f.prompt && (
              <p
                className="mt-1.5 mb-3"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "14.5px",
                  lineHeight: 1.45,
                  color: "var(--color-ink-soft)",
                }}
              >
                {f.prompt}
              </p>
            )}

            {f.type === "textarea" ? (
              <textarea
                id={f.key}
                {...register(f.key)}
                rows={5}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "0.5rem",
                  padding: "0.75rem 0",
                  background: "transparent",
                  border: 0,
                  borderBottom: "1.5px solid var(--color-rule-strong)",
                  fontFamily: "var(--font-display)",
                  fontSize: "17px",
                  lineHeight: 1.6,
                  color: "var(--color-ink)",
                  resize: "vertical",
                  outline: "none",
                }}
                placeholder=" "
              />
            ) : (
              <input
                id={f.key}
                {...register(f.key)}
                type={f.type === "number" ? "number" : "text"}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "0.5rem",
                  padding: "0.6rem 0",
                  background: "transparent",
                  border: 0,
                  borderBottom: "1.5px solid var(--color-rule-strong)",
                  fontFamily: "var(--font-display)",
                  fontSize: "17px",
                  lineHeight: 1.5,
                  color: "var(--color-ink)",
                  outline: "none",
                }}
                placeholder=" "
              />
            )}
          </div>
        </section>
      ))}

      {serverError && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "14px",
            color: "var(--color-clay-deep)",
          }}
        >
          {serverError}
        </p>
      )}

      <div className="pt-4 flex justify-center">
        <button type="submit" disabled={pending} className="btn-clay" style={{ minWidth: "240px" }}>
          {pending ? "Saving …" : "Save the day"}
        </button>
      </div>
    </form>
  );
}

function romanize(n: number): string {
  const numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return numerals[n] ?? String(n);
}
