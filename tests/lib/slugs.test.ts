import { describe, it, expect } from "vitest";
import { slugify, withDiscriminator } from "@/lib/slugs";

describe("slugs", () => {
  it("lowercases and dashes a name", () => {
    expect(slugify("Iron Sharpens Iron")).toBe("iron-sharpens-iron");
    expect(slugify("Donovan & Sam")).toBe("donovan-sam");
    expect(slugify("  Trim  whitespace  ")).toBe("trim-whitespace");
  });

  it("withDiscriminator appends a short random suffix", () => {
    const a = withDiscriminator("foo");
    const b = withDiscriminator("foo");
    expect(a).toMatch(/^foo-[a-z0-9]{4,8}$/);
    expect(a).not.toBe(b);
  });
});
