"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetRequestSchema, type ResetRequestInput } from "@/lib/validators";
import { requestPasswordReset } from "@/server-actions/auth";

export function ResetRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetRequestInput>({ resolver: zodResolver(resetRequestSchema) });

  const onSubmit = (data: ResetRequestInput) => {
    startTransition(async () => {
      await requestPasswordReset(data);
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="space-y-3">
        <div className="rule-ornament" style={{ margin: "0 0 1rem", textAlign: "left" }}>
          <span style={{ color: "var(--color-clay)" }}>✦</span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            fontWeight: 500,
            color: "var(--color-ink)",
          }}
        >
          Check your inbox
        </h3>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "15px",
            lineHeight: 1.55,
            color: "var(--color-ink-soft)",
          }}
        >
          If an account exists for that address, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <div>
        <label htmlFor="email" className="field-label block mb-1.5">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="field"
          {...register("email")}
        />
        {errors.email && (
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "13px",
              color: "var(--color-clay-deep)",
            }}
          >
            {errors.email.message}
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className="btn-clay w-full">
        {pending ? "Sending …" : "Send reset link"}
      </button>
    </form>
  );
}
