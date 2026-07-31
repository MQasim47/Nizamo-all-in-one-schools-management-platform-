# Edu4Everyone — Next.js + Supabase

School Management SaaS for Pakistani schools. Migrated from PHP MVP.

## Setup Steps (do in this exact order)

### 1. Supabase setup
1. Go to https://supabase.com → New Project
   - Name: edu4everyone
   - Region: Singapore (closest to Pakistan)
   - Save your database password somewhere safe
2. Wait ~2 min for project to provision
3. Open **SQL Editor** → New Query → paste ALL of `supabase/schema.sql` → RUN
4. New Query again → paste ALL of `supabase/seed.sql` → RUN
5. Go to **Project Settings → API** and copy these 3 values:
   - Project URL
   - anon public key
   - service_role key (click Reveal)

### 2. Environment variables
1. Rename `.env.local.example` to `.env.local`
2. Paste your 3 Supabase values into it
3. Get a NEXTAUTH_SECRET from https://generate-secret.vercel.app/32 and paste it in

### 3. Install & run
```bash
npm install
npm run dev
```

### 4. Test login
Open: http://localhost:3000/login?school=ghs

Demo accounts (password for all: `password`):
- Principal: principal@ghs.com
- Teacher:   ahmed@ghs.com

Super admin: http://localhost:3000/login?school=admin
- admin@edu4everyone.com

## Troubleshooting

**"School portal not found"** → seed.sql was not run, or .env.local has wrong
Supabase URL/keys. Check the browser Network tab: /api/schools/check response.

**Login says incorrect password** → seed.sql ran but users table hash mismatch.
Re-run seed section 1 & 2. Password is exactly: password

**Module not found '@/...'** → jsconfig.json missing from project root.

**500 error on any /api route** → .env.local values wrong or file still named
.env.local.example. Restart `npm run dev` after any .env change.

## Project structure
- `app/` — pages & API routes (Next.js App Router)
- `components/` — UI components (same design as PHP MVP)
- `lib/` — Supabase client, auth config, database functions
- `supabase/` — SQL files (run in Supabase dashboard, not part of the app)
- `middleware.js` — subdomain detection + auth protection

## Status
DONE: Auth, login, subdomain detection, layout, sidebar, dashboard placeholder
NEXT: Full dashboard, Students + General Register, Classes, Subjects, Teachers,
Attendance, Results, Approvals, Marksheets, Result Sheet, Fees, SLC generation
