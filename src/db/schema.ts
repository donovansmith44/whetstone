import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
  jsonb,
  primaryKey,
  unique,
  time,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// AUTH-ADJACENT TABLES
// ──────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  reminderTime: time("reminder_time").notNull().default("09:00:00"),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
});

export const tokens = pgTable(
  "tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "tokens_kind_check",
      sql`${t.kind} in ('email_verify', 'password_reset')`,
    ),
  ],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

// ──────────────────────────────────────────────────────────────
// GROUPS
// ──────────────────────────────────────────────────────────────

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  discordWebhookUrl: text("discord_webhook_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    check("group_members_role_check", sql`${t.role} in ('owner', 'member')`),
  ],
);

export const groupInvites = pgTable("group_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

// ──────────────────────────────────────────────────────────────
// TEMPLATES (immutable; edits create new rows)
// ──────────────────────────────────────────────────────────────

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // parent_template_id is intentionally NOT a foreign key in v1.
  // It records lineage (cloned-from or previous-version) but is allowed
  // to dangle if a parent template is ever deleted — there's no FK
  // cascade to define meaningful semantics yet (delete cascade would
  // orphan history; set-null would lose lineage). Revisit when Plan 2
  // introduces template editing and the use cases become concrete.
  parentTemplateId: uuid("parent_template_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templateFields = pgTable(
  "template_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    prompt: text("prompt"),
    type: text("type").notNull(),
    order: integer("order").notNull(),
    autocompleteFromFieldKey: text("autocomplete_from_field_key"),
  },
  (t) => [
    unique("template_fields_template_id_key_unique").on(t.templateId, t.key),
    check(
      "template_fields_type_check",
      sql`${t.type} in ('text', 'textarea', 'list', 'number')`,
    ),
  ],
);

export const userActiveTemplate = pgTable("user_active_template", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "restrict" }),
  setAt: timestamp("set_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templatePublications = pgTable(
  "template_publications",
  {
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.templateId, t.groupId] })],
);

// ──────────────────────────────────────────────────────────────
// ENTRIES + ENGAGEMENT
// ──────────────────────────────────────────────────────────────

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "restrict" }),
    entryDate: date("entry_date").notNull(),
    values: jsonb("values").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("entries_user_date_unique").on(t.userId, t.entryDate)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("reactions_entry_user_kind_unique").on(t.entryId, t.userId, t.kind),
    check(
      "reactions_kind_check",
      sql`${t.kind} in ('amen', 'praying', 'encourage', 'you-got-this')`,
    ),
  ],
);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    date: date("date").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("notification_log_unique").on(t.userId, t.groupId, t.kind, t.date),
  ],
);
