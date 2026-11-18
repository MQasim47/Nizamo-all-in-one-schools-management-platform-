# Nizamo — Next.js + Supabase

[![CI](https://github.com/MQasim47/Nizamo-all-in-one-schools-management-platform-/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MQasim47/Nizamo-all-in-one-schools-management-platform-/actions/workflows/ci.yml)

School Management SaaS for Pakistani schools. Migrated from PHP MVP.

## Setup Steps (do in this exact order)

### 1. Supabase setup
1. Go to https://supabase.com → New Project
   - Name: nizamo
   - Region: Singapore (closest to Pakistan)
   - Save your database password somewhere safe
2. Wait ~2 min for project to provision
3. Put the **Session pooler** connection string in `.env.local` as `DATABASE_URL` (see step 2 and `.env.local.example`), then run `npm run migrate`: it applies every file in `supabase/migrations` in order and records it. Never paste migrations into the SQL editor.
4. Dev only: open **SQL Editor** → New Query → paste ALL of `supabase/seed.sql` → RUN (demo accounts; never on production)
5. Go to **Project Settings → API** and copy these 3 values:
   - Project URL
   - anon public key
   - service_role key (click Reveal)

### 2. Environment variables
1. Copy `.env.local.example` to `.env.local` (`cp .env.local.example .env.local`)
2. Paste your 3 Supabase values into it (URL, anon key, service_role key)
3. Generate a `NEXTAUTH_SECRET` (`openssl rand -base64 32`, or https://generate-secret.vercel.app/32) and paste it in
4. `NEXTAUTH_URL` is not read by app code. Leave it as `http://localhost:3000` locally; it is only required in production on hosts other than Vercel.

`.env.local` is git-ignored. Never commit it, and never put the service_role key in a `NEXT_PUBLIC_` variable.

### 3. Install, verify, run
```bash
npm install
npm run migrate    # applies pending database migrations (needs DATABASE_URL)
npm run check:db   # verifies Supabase is reachable, schema + migrations match, demo login works
npm run dev
```

### 4. Test login
Open: http://localhost:3000/login?school=ghs

Demo accounts (password for all: `password`):
- Principal: principal@ghs.com
- Teacher:   ahmed@ghs.com

Super admin: http://localhost:3000/login?school=admin
- admin@nizamo.test

## Troubleshooting

**Anything backend-related** → run `npm run check:db` first. Supabase pauses inactive free projects; if the
host does not resolve, restore the project in the Supabase dashboard and wait ~2 minutes.

**"School portal not found"** → seed.sql was not run, or .env.local has wrong
Supabase URL/keys. Check the browser Network tab: /api/schools/check response.

**Login says incorrect password** → seed.sql ran but users table hash mismatch.
Re-run seed section 1 & 2. Password is exactly: password

**Module not found '@/...'** → jsconfig.json missing from project root.

**500 error on any /api route** → .env.local values wrong or the file is still
named .env.local.example. Restart `npm run dev` after any .env change.

## Project structure
- `app/` — pages & API routes (Next.js App Router)
- `components/` — UI components (same design as PHP MVP)
- `lib/` — Supabase client, auth config, database functions
- `supabase/migrations/` — numbered SQL migrations, applied by `npm run migrate` (tracked in `schema_migrations`); `supabase/seed.sql` is dev-only demo data
- `proxy.js` — subdomain detection + auth protection (Next 16 name for middleware)
- `app/api/v1/` + `lib/services/` — the API pattern every module follows ([docs/API-PATTERN.md](docs/API-PATTERN.md))

## CI and tests
Every push and pull request to `main` runs lint, unit tests, the PDF check, the build, and a database job (all migrations + tenant-isolation tests on a throwaway local Supabase). It never touches the dev database. Tests that need the dev database or a running server (`check:db`, `test:api`, `test:waitlist`, `test:app`, `test:nav`) stay local. Details: [docs/CI.md](docs/CI.md).

## Status
DONE: Auth, login, subdomain detection, layout, sidebar, dashboard placeholder
NEXT: Full dashboard, Students + General Register, Classes, Subjects, Teachers,
Attendance, Results, Approvals, Marksheets, Result Sheet, Fees, SLC generation
