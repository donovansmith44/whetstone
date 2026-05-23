import { randomBytes } from "node:crypto";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function withDiscriminator(base: string, len = 5): string {
  const suffix = randomBytes(8).toString("hex").slice(0, len);
  return `${base}-${suffix}`;
}
