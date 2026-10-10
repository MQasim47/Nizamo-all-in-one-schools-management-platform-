# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Edu4Everyone (package name `edu4everyone`): multi-tenant school management SaaS for Pakistani schools, migrated from a PHP MVP. Next.js 14 (App Router, JavaScript/JSX, no TypeScript) + Supabase (Postgres) + NextAuth (credentials/JWT) + Tailwind. Many logic ports are meant to "match the PHP MVP exactly" (e.g. grade thresholds in `lib/utils/grades.js`), so preserve behavior when changing them.

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — `next lint`
- No test suite is configured.

- `npm run check:db` — backend health check ([scripts/check-db.mjs](scripts/check-db.mjs)): Supabase reachable, schema matches the columns the code uses, demo school `ghs` exists, NextAuth login path works. Run it first when anything backend-related breaks (free Supabase projects pause when idle).

Setup: run `supabase/schema.sql` then `supabase/seed.sql` in the Supabase SQL editor, then `cp .env.local.example .env.local` and fill it in. Code reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`. `NEXTAUTH_URL` is not read by app code (NextAuth reads it itself; only required in production off Vercel). Restart the dev server after env changes.

Local login: `http://localhost:3000/login?school=ghs` (seed users e.g. `principal@ghs.com`, `ahmed@ghs.com`, password `password`); super admin via `?school=admin` (`admin@edu4everyone.com`).

## Architecture

**Multi-tenancy by subdomain.** [middleware.js](middleware.js) derives the school subdomain from the host (`ghs.edu4everyone.com` → `ghs`; on localhost it uses the `?school=` query param) and forwards it as the `x-school-subdomain` request header. It also guards `/school/*` routes by checking for a NextAuth JWT, redirecting to `/login` otherwise. Public routes are the `PUBLIC_ROUTES` list there.

**Auth.** [lib/auth.js](lib/auth.js) is the NextAuth config: a Credentials provider that takes email + password + subdomain, looks up the active school, then the active user within that school, and verifies with bcryptjs. Tenant and role info (`id`, `role`, `schoolId`, `schoolName`, `schoolSubdomain`, `schoolPlan`, `isFirstLogin`) is copied into the JWT and then `session.user`. Roles seen in code: `principal`, `teacher`, `superadmin`.

**Data access.** All DB code lives in `lib/db/*.js` (schools, students, classes) and uses `supabaseAdmin` from [lib/supabase.js](lib/supabase.js) — the service-role client, which **bypasses RLS** (RLS is enabled on every table in `schema.sql`). Because of that, tenant isolation is enforced in application code: every query must filter by `school_id` taken from the session (`session.user.schoolId`), never from client input. Only use `supabaseAdmin` server-side (API routes, server components, NextAuth).

**Routing.** `app/(auth)/login` is the public login page; `app/(dashboard)/school/*` is the authenticated area. [app/(dashboard)/school/layout.jsx](app/(dashboard)/school/layout.jsx) is a server component that re-checks the session, computes the principal's pending-approvals count (distinct class+subject+exam_type among `results` with `status='pending'`), and wraps pages in `components/layout/DashboardLayout`. `app/api/schools/check` validates a subdomain for the login page. `@/` import alias is defined in `jsconfig.json`.

**Domain/schema.** `supabase/schema.sql` defines schools, users, school_settings, classes, subjects, teacher_assignments, students, attendance, results (with an approval `status` workflow), homework, fee_types, fee_structures, fee_payments. Per README status, only auth, login, layout/sidebar and a placeholder dashboard are done; students/register, classes, subjects, teachers, attendance, results, approvals, marksheets, fees, and SLC generation are still to build.

UI primitives (Button, Card, Pill, Alert, FormControl, Modal) are in `components/ui/`; `@react-pdf/renderer` and `papaparse` are installed for marksheet/PDF and CSV import features.

## Product goal

Nizamo: an all-in-one school ERP, Pakistan-first, international later. (Code, package name and some UI still say "Edu4Everyone"; Nizamo is the product name.) Differentiators to protect:
- General Register with B-Form, and one-click SLC
- Class gazette result sheet
- Fee challans with family accounts
- WhatsApp-first parent communication
- Urdu + English printouts
- Local payments: JazzCash, Easypaisa, Raast, bank challan
- Premium design

## Design rules

- Palette: cream `#F5F0E8`, espresso `#2C1810`, terracotta `#C4622D` as the only accent. (`tailwind.config.js` also carries sand, gold, greens/reds from the PHP MVP; don't add more accents.)
- Fonts: Playfair Display for headings, Inter for UI. Note: Inter is not currently loaded anywhere and the dashboard still uses DM Sans; use `next/font` when fixing.
- Calm, premium, Apple-keynote feel. No generic gradient cards, no AI-template look.
- Homepage CSS lives in `app/home.css`, namespaced under `.nz-home`, and must never leak into the dashboard.
- Reuse `components/ui/*` and `components/layout/*` before creating new components.

## Security rules (non-negotiable)

- Every DB query filters by `school_id` taken from the session (`getServerSession(authOptions).user.schoolId`), never from the request body, URL or query string. The service-role client bypasses RLS, so this is the only tenant wall.
- The service-role key is server-only. Never import `lib/supabase.js` (or anything importing it) from a client component, and never put the key in a `NEXT_PUBLIC_` variable.
- Every new table gets `school_id` plus an RLS policy.
- Every edit to marks, fees or the General Register must be auditable (audit log planned, not built yet).
- Never pass a request payload straight into `.update()` / `.insert()`; whitelist columns.

## Roles

Currently `superadmin`, `principal`, `teacher` (also a CHECK constraint on `users.role` in `schema.sql`). Planned: accountant, receptionist, parent, student, plus per-permission control. Don't add more hardcoded `role === 'x'` branches (Sidebar, school layout); route access through a permission map so new roles and permissions don't require touching every call site.

## SEO rules

- Marketing pages are server-rendered and use `generateMetadata`.
- All logged-in dashboard routes (`/school/*`) are `noindex`.
- Don't treat Lighthouse scores as proof of SEO quality.

## Module roadmap (one module per session, in this order)

Tier 1:
1. Roles expansion
2. Students + General Register + SLC and certificates
3. Classes, subjects, staff, Excel bulk import
4. Attendance + WhatsApp absent alert
5. Exams + approvals
6. Marksheet PDF + class gazette
7. Fees: structures, 3-part challans, family accounts, discounts, fines, defaulters, receipts
8. Parent portal (PWA)
9. Principal dashboard
10. ID cards

Tier 2: timetable with clash detection, homework/diary, notices to WhatsApp, staff attendance, leave, payroll, school accounts, online fee payment, bulk promotion, admissions CRM, public school page with admission form.

Tier 3: transport, library, hostel, inventory, quizzes, AI features, multi-campus, native apps.

## Session workflow

- Start every session by reading CLAUDE.md and PROGRESS.md.
- Plan first and wait for approval before writing code.
- Touch only files inside the session's scope.
- Never commit secrets.
- After each module, run `npm run build` and fix errors.
- End every session by updating PROGRESS.md: done, decisions, known issues, next session.
- Report errors with exact file:line.

Latest security/quality audit: [docs/AUDIT.md](docs/AUDIT.md).
