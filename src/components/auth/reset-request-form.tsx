"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetRequestSchema, type ResetRequestInput } from "@/lib/validators";
import { requestPasswordReset } from "@/server-actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<ResetRequestInput>({
    resolver: zodResolver(resetRequestSchema),
  });

  const onSubmit = (data: ResetRequestInput) => {
    startTransition(async () => {
      await requestPasswordReset(data);
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="space-y-2">
        <h2 className="font-medium">Check your email</h2>
        <p className="text-sm text-gray-600">
          If an account exists for that address, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} autoComplete="email" />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
