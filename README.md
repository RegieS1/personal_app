# Be Positive

A personal productivity app: goals, projects, tasks, decisions, finances, learning (lessons and spaced-review notes), wins and daily check-ins. It works on phones and keeps working offline.

## Features

- **Today**: overdue and due-today items, a quick-add bar ("Gym every monday !high"), review and revisit prompts, a completion streak
- **Areas**: Goals → Projects → Tasks (progress rings, health badges), Decisions (revisit and outcome tracking), Finances (monthly budget, categories), Growth (Learning with spaced review, Lessons → Topics with notes, examples and code, Wins, Check-ins)
- Repeating tasks, a focus timer with alarm, Ctrl+K search across everything, a weekly review, JSON/CSV export, reminders, and dark/light themes
- **Offline-first**: data is cached on the device and edits queue in an outbox that syncs when back online; a service worker lets the app open with no connection

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, row-level security)

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon key.
3. In the Supabase SQL editor, run every file in `supabase/migrations/` **in order** (0001 → 0007).
4. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` (and your deployed URL) to the redirect URLs.
5. `npm run dev` and open http://localhost:3000

## Checks

```bash
npx tsc --noEmit                 # types
npm run lint                     # lint
node scripts/dates.check.mjs     # quick-add parser, repeats, friendly dates
node scripts/export.check.mjs    # CSV export (incl. formula-injection guard)
node scripts/items.check.mjs     # offline sync merge rules
```

## How it's built

- **One `items` table** with a `kind` column holds every area; per-area extras live in a `meta` jsonb column. `src/config/kinds.ts` defines the areas and drives the UI.
- **Sync** (`src/lib/items.ts`): each area is cached in localStorage; edits go to an outbox and are upserted with client-generated ids, so retries are safe. Rows the database refuses are kept aside and shown in Settings → Sync instead of blocking everything else.
- **Auth**: `src/proxy.ts` checks the session on every request with `getClaims()`; row-level security makes sure each user can only read and write their own rows.
- **Offline start**: `public/sw.js` (production builds only).
