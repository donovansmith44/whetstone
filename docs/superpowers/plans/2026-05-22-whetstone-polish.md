# Whetstone Plan 6 — Frontend-Design Polish Pass

**Goal:** Take the functional-but-bare shadcn forms and pages and turn them into a polished, distinctive design with personality appropriate for a Christian accountability tool. Per spec §7.

**Branch:** `feat/polish`

## Approach

This plan is fundamentally creative, not mechanical. Invoking the **frontend-design** skill is the core action. The skill iterates visually with the operator until the design feels right. This document is a brief for that skill, not a step-by-step recipe.

## What to redesign

In rough priority order (highest impact first):

1. **Landing page** (`/` — `src/app/page.tsx`) — the only public-facing page; first impression
2. **Daily entry page** (`/today` — `src/app/today/page.tsx`) — the page users see every day; needs to feel inviting and calm, not bureaucratic
3. **Group feed** (`/g/[slug]/page.tsx`) — needs visual hierarchy between today's entries and history, breathing room around each entry card
4. **Entry detail with engagement** (`/g/[slug]/entries/[entryId]/page.tsx`) — reactions and comments need warmth
5. **Dashboard** (`/dashboard/page.tsx`) — checking-in status + group list; the at-a-glance home
6. **Auth flows** (`/signup`, `/signin`, `/reset-password`, `/verify-email/[token]`) — currently very plain forms; need to feel hospitable

Lower priority (functional ok, polish later):
7. Template editor (`/templates/[id]/edit`, `/templates/new`) — power-user surface
8. Group settings / invite link / template gallery pages
9. Preferences page (`/me/settings`)

## Design system intent

From the spec §7:
- **Palette**: warm earthy neutrals (sand, taupe, cream) with one warm accent (deep terracotta or forest)
- **Tone**: calm, contemplative — spiritual-formation-adjacent. NOT corporate, NOT gamified, NOT youth-pastor-jokes
- **Typography**: serif accents for emotional moments (entry prompts, scripture-style headings); clean sans for UI
- **Layout**: mobile-first, generous whitespace, plenty of breathing room around each entry card
- **Microinteractions**: minimal — gentle transitions on reaction toggles, soft fade-ins on entry posts

The placeholder palette in `tailwind.config.ts` (sand/ink/accent) can be replaced or refined during this pass.

## Execution recipe

Invoke the `frontend-design` skill targeted at the priority list above, one or two screens per dispatch. Each dispatch:

1. Read the existing page + the spec's design intent
2. Generate 2-3 design directions as static mockups (HTML+CSS, no Next.js routing) in a `_design/` sandbox
3. User picks one (or asks for revisions)
4. Port the chosen design into the actual page

Iterate until the priority screens feel good. Lower-priority pages (templates editor, settings) can inherit the design system established by the priority screens.

## Out of scope

- Custom illustrations (defer to v2)
- Onboarding animations / tour
- Email template redesign (Resend HTML emails stay as-is; functional)
- Mobile gesture interactions

## Final

When the operator decides the polish is "good enough for v1":

```
git tag v0.6.0-polish
git push origin feat/polish
git push --tags
git checkout master
git merge --no-ff feat/polish -m "Merge feat/polish into master

Plan 6 shipped: frontend-design polish pass on priority screens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git branch -d feat/polish
```

## Note for the controller

Unlike Plans 1-5, this plan can't be cranked through with a single subagent batch. The frontend-design skill is iterative + needs human feedback per design direction. Best to do this AFTER initial deployment (Plan 7) so the designer can see the real app in action and feel its rhythm, not just static mockups.

Recommendation: ship Plan 7 first (so the app is real and usable), then iterate on Plan 6 in real-world feedback cycles.
