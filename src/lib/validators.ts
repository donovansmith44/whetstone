import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  name: z.string().min(1, "Name is required").max(80),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetRequestSchema = z.object({
  email: z.string().email(),
});

export const resetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type ResetConfirmInput = z.infer<typeof resetConfirmSchema>;

export const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  discordWebhookUrl: z.string().url().optional().or(z.literal("")),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const templateFieldSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, digits, underscores"),
  label: z.string().min(1).max(80),
  prompt: z.string().max(300).optional(),
  type: z.enum(["text", "textarea", "list", "number"]),
  order: z.number().int().min(0),
  autocompleteFromFieldKey: z.string().optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  fields: z.array(templateFieldSchema).min(1, "Add at least one field"),
});
export type TemplateInput = z.infer<typeof templateSchema>;

export const entrySchema = z.object({
  templateId: z.string().uuid(),
  values: z.record(z.string(), z.string()),
});
export type EntryInput = z.infer<typeof entrySchema>;
