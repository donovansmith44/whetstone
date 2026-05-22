import { describe, it, expect } from "vitest";
import { generateToken, addExpiry } from "@/lib/tokens";

describe("tokens", () => {
  it("generates URL-safe tokens of expected length", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(32);
  });

  it("generates unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it("addExpiry returns a Date in the future by the given hours", () => {
    const now = new Date("2026-05-22T12:00:00Z");
    const later = addExpiry(24, now);
    expect(later.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
