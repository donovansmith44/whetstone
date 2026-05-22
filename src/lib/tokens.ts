import { randomBytes } from "node:crypto";

/** URL-safe base64 token, ~43 chars from 32 random bytes. */
export function generateToken(): string {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function addExpiry(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}
