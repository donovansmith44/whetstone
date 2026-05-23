"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signinSchema, type SigninInput } from "@/lib/validators";

export function SigninForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninInput>({ resolver: zodResolver(signinSchema) });

  const onSubmit = (data: SigninInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setServerError("Those credentials didn't match. Try again?");
      } else {
        const { getOnboardingRedirect } = await import("@/server-actions/onboarding");
        const dest = await getOnboardingRedirect();
        router.push(dest as never);
        router.refresh();
      }
    });
  };

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
      <div>
        <label htmlFor="password" className="field-label block mb-1.5">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "Opening …" : "Sign in"}
      </button>
    </form>
  );
}
