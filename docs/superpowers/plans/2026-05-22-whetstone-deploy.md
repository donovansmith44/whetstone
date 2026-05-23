# Whetstone Plan 7 — Deploy to Vercel

**Goal:** Whetstone is live at a public URL, environment is production-grade, the first two users (Donovan + Catholic friend) can sign up and use it.

**Branch:** `feat/deploy` (or just commit directly to master — most changes are config)

## Prerequisites (user-only)

This plan requires actions only the user can do — flag each clearly and pause for confirmation:

- **Vercel account** — sign up at https://vercel.com (free Hobby plan is enough for v1)
- **GitHub connection** — Vercel needs read access to the `donovansmith44/whetstone` repo
- **Production Neon branch** — Neon supports "branches" of a DB; create a `production` branch separate from `dev` so production deployments don't share data with local dev
- **Production Resend** — verify a sending domain in Resend (e.g., `whetstone.app` or whatever you own) so production emails don't get sent from the sandbox `onboarding@resend.dev` address
- **Domain (optional)** — buy a domain (e.g., `whetstone.app`) and point it at Vercel; otherwise use the free `whetstone.vercel.app` subdomain

## Task 1: Create the Vercel project

User-action:
1. In Vercel dashboard → Add New Project → import `donovansmith44/whetstone`
2. Framework preset: Next.js (auto-detected)
3. Root directory: leave default (./)
4. Build command: default (`next build`)
5. Output directory: default (`.next`)
6. Install command: default (`npm install`)

Don't deploy yet — first set env vars (Task 2).

## Task 2: Set production env vars in Vercel

In the Vercel project settings → Environment Variables, add for the `Production` environment:

```
DATABASE_URL          # the Neon PRODUCTION branch connection string (NOT dev)
AUTH_SECRET           # generate a NEW one for production: openssl rand -base64 32
AUTH_URL              # https://whetstone.vercel.app (or your domain)
RESEND_API_KEY        # production Resend key (can be the same as dev if domain is verified)
RESEND_FROM_EMAIL     # Whetstone <noreply@whetstone.app> (or sandbox if not yet)
CRON_SECRET           # generate one: openssl rand -base64 32; required for /api/cron/reminders
```

Optionally set the same for the `Preview` environment so PR preview deploys work.

## Task 3: Run production migrations

From local with the production DATABASE_URL set in `.env.local` temporarily (or via direct CLI):

```bash
DATABASE_URL="<production-neon-url>" npm run db:migrate
```

This creates all 15 v1 tables in the production database. Drizzle's migration log will track applied migrations.

**Be careful here:** make sure you're pointing at production, not dev. After migrating, verify with `db:studio` or a quick SQL query.

## Task 4: Trigger first deploy

In Vercel: Deployments → Deploy. Or push a small commit to master to trigger automatic deploy.

Watch the build log. If it fails:
- Build errors → fix locally + push again
- Env var errors → re-check Vercel project settings
- Database connection errors → verify production `DATABASE_URL` reaches Neon

When successful, visit the deploy URL.

## Task 5: Smoke-test production

Walk through the flow live:
1. `/` → click Get started
2. Sign up with a real email
3. Receive verification email (check spam if needed)
4. Click verify → confirm
5. Sign in
6. Create your first template
7. Create a group
8. Generate an invite link
9. Open invite link in incognito → sign up as second user → join group
10. Both users post a daily entry
11. Each sees the other's entry in the group feed
12. React + comment
13. Publish a template, second user clones it
14. Set Discord webhook URL in group, wait for cron to run (or manually trigger via curl with `CRON_SECRET`)

If anything breaks, fix on a branch, PR, deploy preview, merge.

## Task 6: Invite Catholic friend

User-action: send the invite link generated in step 8 to the friend. They sign up, join, start checking in.

## Task 7: Decide on domain

Vercel preview URL works forever. If you want `whetstone.app` or similar:
1. Buy the domain
2. Add it in Vercel → Domains
3. Update DNS at the registrar per Vercel's instructions
4. Update `AUTH_URL` env var to the new domain
5. Update `RESEND_FROM_EMAIL` to use the new domain
6. Re-verify sending domain in Resend

## Final

```
git tag v1.0.0
git push --tags
```

The product is live. Iterate on it.

## Notes for the controller

- This plan is heavily user-action-dependent. Do NOT attempt to drive Vercel CLI / signup flows from a subagent — they require browser interaction + sensitive credentials.
- Pause for the user at each "User-action" marker.
- The cron route will start firing as soon as the deploy goes live and the schedule is in `vercel.json`. Monitor the first few runs in Vercel's Function Logs for unexpected errors.
- If using a custom domain, also test the OAuth callback URLs (if you've added OAuth providers since v1) — NextAuth requires matching `AUTH_URL`.
