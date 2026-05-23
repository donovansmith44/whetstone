"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { resetConfirmSchema, type ResetConfirmInput } from "@/lib/validators";
import { confirmPasswordReset } from "@/server-actions/auth";

export function ResetConfirmForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetConfirmInput>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: { token },
  });

  const onSubmit = (data: ResetConfirmInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await confirmPasswordReset(data);
      if (result.ok) router.push("/signin");
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <input type="hidden" {...register("token")} />
      <div>
        <label htmlFor="password" className="field-label block mb-1.5">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="field"
          {...register("password")}
        />
        {errors.password && (
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "13px",
              color: "var(--color-clay-deep)",
            }}
          >
            {errors.password.message}
          </p>
        )}
      </div>

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

      <button type="submit" disabled={pending} className="btn-clay w-full">
        {pending ? "Saving …" : "Set new password"}
      </button>
    </form>
  );
}
