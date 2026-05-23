"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signupSchema, type SignupInput } from "@/lib/validators";
import { signup } from "@/server-actions/auth";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const onSubmit = (data: SignupInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signup(data);
      if (result.ok) router.push("/verify-email");
      else setServerError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <Field
        label="Your name"
        id="name"
        autoComplete="name"
        register={register("name")}
        error={errors.name?.message}
      />
      <Field
        label="Email"
        id="email"
        type="email"
        autoComplete="email"
        register={register("email")}
        error={errors.email?.message}
      />
      <Field
        label="Password"
        id="password"
        type="password"
        autoComplete="new-password"
        register={register("password")}
        error={errors.password?.message}
        hint="At least twelve characters."
      />

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
        {pending ? "Sending …" : "Create account"}
      </button>
    </form>
  );
}

function Field({
  label,
  id,
  type = "text",
  autoComplete,
  register,
  error,
  hint,
}: {
  label: string;
  id: string;
  type?: string;
  autoComplete?: string;
  register: ReturnType<ReturnType<typeof useForm>["register"]>;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label block mb-1.5">
        {label}
      </label>
      <input id={id} type={type} autoComplete={autoComplete} className="field" {...register} />
      {hint && !error && (
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "12.5px",
            color: "var(--color-ink-faint)",
          }}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "13px",
            color: "var(--color-clay-deep)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
