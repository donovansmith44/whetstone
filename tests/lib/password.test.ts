import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashes a password and verifies it back", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for the same password (salt)", async () => {
    const a = await hashPassword("hunter2");
    const b = await hashPassword("hunter2");
    expect(a).not.toBe(b);
  });
});
