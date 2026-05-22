import { describe, it, expect } from "vitest";
import { signupSchema, signinSchema, resetRequestSchema, resetConfirmSchema } from "@/lib/validators";

describe("validators", () => {
  it("signupSchema accepts a valid payload", () => {
    const result = signupSchema.safeParse({
      email: "donovan@example.com",
      name: "Donovan",
      password: "longenough123",
    });
    expect(result.success).toBe(true);
  });

  it("signupSchema rejects short passwords", () => {
    const result = signupSchema.safeParse({
      email: "a@b.com",
      name: "A",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("signupSchema rejects bad emails", () => {
    const result = signupSchema.safeParse({
      email: "notanemail",
      name: "A",
      password: "longenough123",
    });
    expect(result.success).toBe(false);
  });

  it("signinSchema accepts email + password only", () => {
    const result = signinSchema.safeParse({
      email: "a@b.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("resetRequestSchema requires an email", () => {
    expect(resetRequestSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(resetRequestSchema.safeParse({}).success).toBe(false);
  });

  it("resetConfirmSchema requires token + new password", () => {
    expect(
      resetConfirmSchema.safeParse({ token: "abc", password: "longenough123" }).success,
    ).toBe(true);
    expect(
      resetConfirmSchema.safeParse({ token: "abc", password: "short" }).success,
    ).toBe(false);
  });
});
