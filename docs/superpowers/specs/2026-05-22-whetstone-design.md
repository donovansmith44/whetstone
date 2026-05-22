# Whetstone — v1 Design

**Status**: Approved · ready for implementation planning
**Date**: 2026-05-22
**Owner**: Donovan Smith

---

## 1. Context

Whetstone is a web app for daily accountability check-ins among small,
trusted groups. Origin: the author and a Catholic friend wanted a
shared board where each person posts a daily update against a structured
template, and groupmates can react and encourage.

The defining choice that separates Whetstone from a generic standup tool:
**templates are personal, not group-owned.** Each member tracks what
matters to *them*. Groups are the audience — your entries appear in
your groupmates' feeds, rendered with your fields. Templates can be
published into a group's gallery so others can clone them as a starter.

Tone: spiritual-formation-adjacent. Reactions and copy lean into a
Christian accountability vocabulary (Amen, Praying) rather than generic
emoji.

## 2. Goals & non-goals

### Goals

- Two-person groups work great on day one; the data model scales to small
  groups (≤ ~25 members) without rework.
- A daily check-in takes < 2 minutes for someone returning to it daily,
  thanks to deterministic carry-forward autocomplete.
- A non-developer can use it on mobile (signup → daily entry → see
  groupmates) without friction.
- Personal templates are first-class: define your own fields, edit
  anytime, publish into a group for others to clone.
- Group accountability loop is closed: when you miss a day, your group's
  Discord channel pings; when you post, groupmates see it and can react
  or comment.

### Non-goals (explicitly v1)

- No public template gallery / cross-group template publishing
- No Discord bot with slash commands (webhooks only)
- No SMS, push, or email reminders (Discord only)
- No AI-generated autocomplete (deterministic carry-forward only)
- No multi-group orgs, custom themes per group, native mobile app, or
  email digests
- No payment / billing — free for v1 users

## 3. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend + backend | Next.js 15 (App Router) + TypeScript | One framework, server actions, easy Vercel deploy |
| DB | Postgres on Neon (free tier) | Relational, serverless, generous free tier |
| ORM | Drizzle | TypeScript-native, lightweight, good Neon support |
| Auth | NextAuth v5 (Auth.js) — credentials provider | Email + password per user choice |
| Password hash | bcrypt | Standard, well-supported |
| Email | Resend | Free tier covers verification + password reset |
| Styling | Tailwind CSS + shadcn/ui | Pairs with the frontend-design skill's polish path |
| Forms / validation | React Hook Form + Zod | Standard pairing in the Next.js world |
| Notifications | `fetch` to Discord webhook URLs | No bot infra needed for v1 |
| Scheduling | Vercel Cron | Runs a reminder-sweep route on a schedule |
| Hosting | Vercel | Free tier handles two-person traffic indefinitely |

## 4. Data model

```
User
  id                  uuid PK
  email               text unique not null
  password_hash       text not null
  name                text not null
  image_url           text
  email_verified_at   timestamptz
  timezone            text not null default 'America/New_York'
  created_at          timestamptz default now()

UserPreferences
  user_id             uuid PK FK -> User.id
  reminder_time       time not null default '09:00'
  reminder_enabled    boolean not null default true

Group
  id                  uuid PK
  slug                text unique not null
  name                text not null
  description         text
  owner_id            uuid FK -> User.id
  discord_webhook_url text
  created_at          timestamptz default now()

GroupMember
  group_id            uuid FK -> Group.id
  user_id             uuid FK -> User.id
  role                text check (role in ('owner','member')) not null
  joined_at           timestamptz default now()
  PRIMARY KEY (group_id, user_id)

GroupInvite
  id                  uuid PK
  group_id            uuid FK -> Group.id
  token               text unique not null
  expires_at          timestamptz not null
  created_by          uuid FK -> User.id
  used_by             uuid FK -> User.id
  used_at             timestamptz

Template
  id                  uuid PK
  owner_user_id       uuid FK -> User.id
  name                text not null
  description         text
  parent_template_id  uuid FK -> Template.id  -- set when cloned from another template
                                              -- (also used for same-user edit history)
  created_at          timestamptz default now()

-- Templates are IMMUTABLE. Editing creates a new Template row whose
-- parent_template_id points to the prior row, and UserActiveTemplate
-- is updated to the new row's id. Existing Entry rows continue to
-- reference the older Template id and render with its original fields.
-- This avoids needing a separate version-snapshot table.

TemplateField
  id                  uuid PK
  template_id         uuid FK -> Template.id
  key                 text not null            -- stable, used in Entry.values JSON
  label               text not null            -- displayed above input
  prompt              text                     -- placeholder / helper text
  type                text check (type in ('text','textarea','list','number')) not null
  order               int not null
  autocomplete_from_field_key  text            -- prefill from a key on your most recent entry
  UNIQUE (template_id, key)

UserActiveTemplate
  user_id             uuid PK FK -> User.id
  template_id         uuid FK -> Template.id
  set_at              timestamptz default now()

TemplatePublication
  template_id         uuid FK -> Template.id
  group_id            uuid FK -> Group.id
  published_at        timestamptz default now()
  published_by        uuid FK -> User.id
  PRIMARY KEY (template_id, group_id)

Entry
  id                  uuid PK
  user_id             uuid FK -> User.id
  template_id         uuid FK -> Template.id  -- points to the immutable Template row in use
                                              -- at submit time; survives later edits/clones
  entry_date          date not null
  values              jsonb not null
  created_at          timestamptz default now()
  updated_at          timestamptz default now()
  UNIQUE (user_id, entry_date)

Reaction
  id                  uuid PK
  entry_id            uuid FK -> Entry.id
  user_id             uuid FK -> User.id
  kind                text check (kind in ('amen','praying','encourage','you-got-this')) not null
  created_at          timestamptz default now()
  UNIQUE (entry_id, user_id, kind)

Comment
  id                  uuid PK
  entry_id            uuid FK -> Entry.id
  user_id             uuid FK -> User.id
  body                text not null
  created_at          timestamptz default now()

NotificationLog
  id                  uuid PK
  user_id             uuid FK -> User.id
  group_id            uuid FK -> Group.id
  kind                text not null   -- 'daily-reminder' or 'entry-posted'
  date                date not null
  sent_at             timestamptz default now()
  UNIQUE (user_id, group_id, kind, date)
```

Notes:
- `Entry` has **no group_id**. It's user-owned and date-scoped (one per
  user per day). Visibility in a group feed is derived from current
  group membership.
- Editing your entry on the same date overwrites in place. After
  midnight in the user's timezone, the entry is read-only.
- **Member leaves a group**: their `GroupMember` row is deleted. Their
  entries remain in their `/me` history and stay visible in any *other*
  groups they're still in, but stop appearing in the departed group's
  feed (immediately for new visits; existing tabs may show stale data
  until refresh). Their past comments and reactions on that group's
  entries are preserved (read-only attribution).
- **Comment deletion** is hard delete in v1 (no soft-delete column).
  Author deletes their own; entry owner can delete any on their entry.

## 5. User flows

### 5.1 Auth / onboarding

1. `/signup`: email + password + name → user created (`email_verified_at = null`)
2. Resend sends verification email with one-time link → on click, sets
   `email_verified_at = now()` and signs the user in
3. First-run flow: pick a starter template (≥ 2 built-ins seeded into
   the DB, copyable into a personal template) OR define your own from
   scratch
4. Optional: join a group via invite link, or create your first group

`/signin`: standard email + password form. Password reset via Resend
magic link → set new password page.

### 5.2 Groups

- `/groups/new`: name + description + optional Discord webhook URL.
  Creates Group, GroupMember (role=owner), redirects to `/g/[slug]`.
- `/g/[slug]/invite`: generates a `GroupInvite` token (7-day expiry by
  default), shows shareable link `/invite/[token]`.
- `/invite/[token]`: lands here from the share link. If signed out,
  prompted to sign in or sign up first. If signed in and valid,
  one-click join.
- `/g/[slug]/settings`: owner can edit name/description/webhook,
  promote/remove members. Members can leave.

### 5.3 Templates

- `/templates/new`: form to add fields (key, label, prompt, type, order,
  optional autocomplete_from). Save creates a `Template` and (if no
  active template) sets `UserActiveTemplate`.
- `/templates/[id]/edit`: same form, populated. Save creates a **new
  Template row** with `parent_template_id = [id]`, then updates
  `UserActiveTemplate` to the new id. The old row stays referenced by
  any existing Entries so history renders correctly.
- `/templates`: list of templates I own. Mark one active.
- `/g/[slug]/templates`: gallery of templates **published into this
  group**. Each shows preview of fields. "Use this as mine" button
  clones (new Template row, `parent_template_id` set, `owner_user_id`
  = me) and offers to set it as my active template.
- Publishing: from `/templates/[id]`, "Publish to group..." picks one
  of my groups, creates a `TemplatePublication` row.

### 5.4 Daily entry

- `/today`: renders my active template. For each field with
  `autocomplete_from_field_key` set, prefill input with the value from
  that key on my **most recent Entry** (any date).
- Submit → creates `Entry` with `entry_date = today (in user tz)`,
  `template_id = active.template_id`.
- Same-day re-submit updates the same row. After midnight (in my tz),
  the row becomes read-only.
- Confirmation redirects to `/g/[slug]/today` (the first group I'm in,
  if any).

### 5.5 Group feed

- `/g/[slug]/today`: today's entries from all members, ordered by
  `created_at` desc. Each entry card:
  - Header: avatar, name, time
  - Body: rendered using the entry's own template fields (label + value)
  - Footer: reaction row (Amen / Praying / Encourage / You Got This)
    + comment count + "Reply" affordance
- `/g/[slug]`: same as `/today` but with a date picker / history scroll.
- `/g/[slug]/entries/[entry_id]`: full detail view with the comments
  thread inline.
- `/me`: my personal history (calendar grid of past entries).

### 5.6 Engagement

- Reactions: toggle per user per kind (one of each kind per entry max).
  Optimistic UI; server action persists.
- Comments: plain text, no markdown rendering in v1. Author can delete
  their own comments. Owner of the entry can delete any comment on
  their entry.
- Reaction set is fixed in v1: Amen, Praying, Encourage, You Got This.

## 6. Notifications

- Vercel Cron hits `/api/cron/reminders` every 30 minutes.
- For each Group:
  - Skip if `discord_webhook_url` is null
  - For each member where `reminder_enabled = true`:
    - If they have no Entry for today (in their tz) AND current time in
      their tz is between `reminder_time` and `reminder_time + 11 hours`:
      - If they haven't been reminded in this group today already:
        - POST a Discord message: "**{name}** hasn't checked in yet
          today — [Open Whetstone](https://whetstone.app/today)"
        - Record a `NotificationLog` row (user_id, group_id, kind,
          date) to dedupe
- New entry posted: optional webhook POST (group setting; default off)
  with a short summary.

`NotificationLog` is defined in §4 alongside the other tables.

## 7. Frontend approach

- shadcn/ui as the component base (Button, Card, Dialog, Input,
  Textarea, Avatar, DropdownMenu, etc.). Components are copy-pasted
  into `src/components/ui` and customized as needed.
- Tailwind CSS for layout; design tokens defined in
  `tailwind.config.ts`.
- Palette: warm earthy neutrals (sand, taupe, cream) with one warm
  accent (deep terracotta or forest). Subtle, calm — appropriate for
  spiritual formation tone. Final colors selected during the
  frontend-design polish pass.
- Mobile-first: every page works on a 375×667 viewport before any
  desktop refinements.
- After the spine is functional, invoke the **frontend-design** skill
  to do a polish pass on landing, signup, /today, group feed, entry
  detail, and template editor screens. That pass owns: hero
  illustrations or motifs, typography pairing, micro-interactions,
  loading/empty states.

## 8. Implementation order (for the plan)

1. Bootstrap: Next.js app, Drizzle migrations, Neon connection,
   NextAuth credentials provider, signup/signin
2. Schema + DB: all tables from §4 + §6
3. Groups + invites: create / join / leave / member management
4. Templates: CRUD, versioning, active-template pointer
5. Daily entry: `/today`, autocomplete carry-forward, submit, edit
6. Group feed: today + history, entry detail page
7. Engagement: reactions + comments
8. Template gallery: publish + clone flow
9. Notifications: Vercel Cron + Discord webhook POST + NotificationLog
10. Frontend-design polish pass
11. Deploy to Vercel, point at production Neon DB, invite first user

## 9. Open questions for future versions

- **Multiple groups**: should an Entry be filterable so it only shows in
  some groups? V1 assumption is "visible to all groups I'm in" — may
  need per-entry audience selection in v2.
- **Streaks / gentle gamification**: not in v1; consider for v2 if the
  Christian accountability tone supports it without feeling gimmicky.
- **Template gallery beyond the group**: a public/community gallery of
  great templates is a v2+ feature.
- **Discord bot**: webhooks cover the v1 reminder use case; a bot is
  worth building only if users ask for in-Discord composition.
- **Mobile native**: the web app is mobile-first and installable as a
  PWA; native is only worth the cost if usage is high and push
  notifications become essential.
