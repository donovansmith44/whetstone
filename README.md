# Whetstone

A small web app for daily accountability check-ins among trusted groups.

Each member tracks what matters to *them* via a personal template; groups
are the audience for those entries. Templates can be published into a
group's gallery so others can clone them.

## Status

Plan 2 (Groups + Templates + Daily Entry) shipped. Engagement, publishing, notifications, polish still to come — see `docs/superpowers/plans/`.

## Local development

Prerequisites:
- Node.js 20+
- A Neon Postgres database (free tier at https://neon.tech)
- A Resend API key (free tier at https://resend.com)

Setup:
```bash
cp .env.example .env.local  # then fill in DATABASE_URL, AUTH_SECRET, RESEND_API_KEY
npm install
npm run db:migrate
npm run dev
```

Visit http://localhost:3000.

## Useful scripts

- `npm run dev` — local dev server
- `npm test` — Vitest unit tests
- `npm run db:generate` — generate a new migration from schema changes
- `npm run db:migrate` — apply migrations to the configured DB
- `npm run db:studio` — open Drizzle Studio in the browser

## Cron route (Discord reminders)

Vercel runs `GET /api/cron/reminders` every 30 minutes (configured in `vercel.json`).
It finds group members whose reminder window has opened, haven't checked in yet, and
posts a nudge to the group's Discord webhook. Deduplication is handled by `notification_log`.

**Required env vars (Vercel project settings):**
- `CRON_SECRET` — Vercel sets this automatically; the route checks `Authorization: Bearer <secret>`
- `DISCORD_WEBHOOK_URL` is stored per-group in the database, not as a global env var

**Testing locally:**

1. Add `CRON_SECRET=any-string` to `.env.local` (or omit it to skip auth in dev)
2. Start the dev server: `npm run dev`
3. Hit the route:
   ```bash
   curl -X GET "http://localhost:3000/api/cron/reminders" \
     -H "Authorization: Bearer any-string"
   ```
   Returns `{ ok: true, sent: [] }` when no users qualify.

## Architecture

See [`docs/superpowers/specs/2026-05-22-whetstone-design.md`](docs/superpowers/specs/2026-05-22-whetstone-design.md)
for the v1 design.
