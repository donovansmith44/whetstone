// NOTE: this is a placeholder test that documents the invariant.
// Full DB-integration tests come in a later plan when we have test-DB infra.
// For now, this file just verifies the module imports without errors.
import { describe, it, expect, vi } from "vitest";

// Mock DB and auth so the module can be imported without a real DATABASE_URL or session
vi.mock("@/db", () => ({
  db: {},
  schema: {},
}));
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import * as templates from "@/server-actions/templates";

describe("templates server actions", () => {
  it("exports the expected surface", () => {
    expect(typeof templates.createTemplate).toBe("function");
    expect(typeof templates.updateTemplate).toBe("function");
    expect(typeof templates.setActiveTemplate).toBe("function");
    expect(typeof templates.listMyTemplates).toBe("function");
    expect(typeof templates.getTemplateWithFields).toBe("function");
    expect(typeof templates.getActiveTemplate).toBe("function");
  });
});
