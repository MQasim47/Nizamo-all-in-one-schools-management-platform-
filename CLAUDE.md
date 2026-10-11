# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Nizamo (package name `nizamo`; production domain `getnizamo.com`, schools at `<subdomain>.getnizamo.com`, always via `NEXT_PUBLIC_ROOT_DOMAIN`): multi-tenant school management SaaS for Pakistani schools, migrated from a PHP MVP. Next.js 16 + React 19 (App Router, JavaScript/JSX, no TypeScript) + Supabase (Postgres) + NextAuth (credentials/JWT) + Tailwind. Many logic ports are meant to "match the PHP MVP exactly" (e.g. grade thresholds in `lib/utils/grades.js`), so preserve behavior when changing them.

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — `eslint .` (flat config in `eslint.config.mjs`; `next lint` no longer exists in Next 16)
- `npm run test:unit` — unit tests (`tests/`: phone normaliser, CSV safety).
- `npm run test:waitlist` — waitlist/admin/register API checks against a running server (`TEST_BASE=http://localhost:3100`, start it with `npm run dev -- -p 3100`).
- `npm run test:pdf` — proves `@react-pdf/renderer` renders a PDF (needed for SLC, marksheets, challans).
- `npm run test:tenant` — proves tenant isolation through per-user tokens against the dev project (seeds and removes two throwaway schools). Run after any schema/policy change.
- `npm run demo:passwords` — gives the demo accounts unique strong passwords (writes `.env.local`).
- `npm run check:db` — backend health check ([scripts/check-db.mjs](scripts/check-db.mjs)): Supabase reachable, schema matches the columns the code uses, demo school `ghs` exists, NextAuth login path works. Run it first when anything backend-related breaks (free Supabase projects pause when idle).

Setup: run `supabase/schema.sql` then `supabase/seed.sql` in the Supabase SQL editor, then `cp .env.local.example .env.local` and fill it in. See `.env.local.example` for every variable (Supabase URL/keys, `SUPABASE_JWT_SECRET`, `NEXTAUTH_SECRET`, root domain, demo mode). `NEXTAUTH_URL` is not read by app code (NextAuth reads it itself; only required in production off Vercel). Restart the dev server after env changes.

Local login: `http://localhost:3000/login?school=ghs` (seed users e.g. `principal@ghs.com`, `ahmed@ghs.com`, password `password`); super admin via `?school=admin` (`admin@edu4everyone.com`).

## Architecture

**Multi-tenancy by subdomain.** [proxy.js](proxy.js) (Next 16 name for middleware) derives the school subdomain from the host (needs `NEXT_PUBLIC_ROOT_DOMAIN`, e.g. `ghs.getnizamo.com` → `ghs`; on exact `localhost` it uses `?school=`) and forwards it as the `x-school-subdomain` header, which the login page reads. It guards `/school/*` (and `/admin/*`, superadmin only) with a NextAuth JWT and redirects to `/signed-out` if the token's school differs from the host's. Unknown school subdomains get a 404 (`/school-not-found`, via the guarded `/api/internal/school-exists`), `www` redirects to the apex, a school's own `/` goes to its login, and every school address is `X-Robots-Tag: noindex`.

**Auth.** [lib/auth/options.js](lib/auth/options.js): Credentials provider (email + password + subdomain, bcrypt, zod-validated), 24h JWT, lockout after 5 consecutive failures for 15 min (`login_attempts`, identifier is a hash, never the email). The token is only a ticket: [lib/auth/session.js](lib/auth/session.js) `requireSession({permission})` (pages/layouts) and `requireApiSession(permission)` (route handlers) re-check on every request (cached 60s) that the user is active and the school not suspended, and return the CURRENT role from the DB. Never call `getServerSession` directly.

**Data access: two clients, one rule.**
- `getSchoolClient(session)` ([lib/supabase/school.js](lib/supabase/school.js)) is the only way school-scoped code reaches the DB. It signs a 10-minute HS256 JWT (`role=authenticated`, `sub`, `school_id`, `app_role`) with `SUPABASE_JWT_SECRET` and returns `{ db, schoolId, userId, role }`. Postgres RLS enforces the school and the role. `lib/db/{students,classes,schools}.js` take that `ctx` as first argument and have no `schoolId` parameter.
- The service-role client lives only in `lib/db/admin/*` (`server-only`): login helpers, public school lookup, `register_school`, and superadmin functions behind `assertSuperadmin(session)`. Do not import it anywhere else.

**RLS model** ([supabase/migrations/002_rls_and_hardening.sql](supabase/migrations/002_rls_and_hardening.sql)): every policy checks `school_id = app.school_id()` (which is NULL unless the JWT's user is active and the school active) plus `app.can('x.y')` from the `role_permissions` table. Teachers are limited via `teacher_assignments`; parents/students via `user_students`. Add a role = insert `role_permissions` rows + update [lib/auth/permissions.mjs](lib/auth/permissions.mjs) (`npm run test:tenant` fails if they disagree). New tables need RLS enabled, a policy, and explicit GRANTs (default privileges for API roles are revoked). `users.password_hash` is not readable by API roles, so list columns instead of `select('*')` on `users`. Students are soft-deleted (`deleted_at`), GR numbers are assigned by a DB trigger, and changes to users/students/results/fees/settings are written to the append-only `audit_log` by triggers.

**Routing.** `app/(auth)/login` (server page resolves the school; `LoginForm.jsx` is the client form), `app/signed-out` clears the session with a reason, `app/(dashboard)/school/*` is the private area (noindex; layout calls `requireSession`). `app/api/schools/check` is zod-validated and rate-limited. `@/` alias is in `jsconfig.json`. Security headers (CSP in report-only mode) and `X-Robots-Tag` for private routes are in `next.config.js`.

**Domain/schema.** `supabase/schema.sql` (001) defines schools, users, school_settings, classes, subjects, teacher_assignments, students, attendance, results (approval workflow), homework, fee_types, fee_structures, fee_payments; migration 002 adds user_students, role_permissions, school_counters, audit_log, login_attempts. Most feature modules are still to build (see roadmap).

**Demo mode.** `NEXT_PUBLIC_DEMO_MODE=true` shows demo shortcuts on the demo school's login page; passwords come from server-only `DEMO_PASSWORD_*` env vars generated by `npm run demo:passwords`. The superadmin shortcut never shows when `NODE_ENV=production`.

UI primitives (Button, Card, Pill, Alert, FormControl, Modal) are in `components/ui/`; `@react-pdf/renderer` and `papaparse` are installed for marksheet/PDF and CSV import features.

## Product goal

Nizamo: an all-in-one school ERP, Pakistan-first, international later. Differentiators to protect:
- General Register with B-Form, and one-click SLC
- Class gazette result sheet
- Fee challans with family accounts
- WhatsApp-first parent communication
- Urdu + English printouts
- Local payments: JazzCash, Easypaisa, Raast, bank challan
- Premium design

## Design rules

- Palette: cream `#F5F0E8`, espresso `#2C1810`, terracotta `#C4622D` as the only accent. (`tailwind.config.js` also carries sand, gold, greens/reds from the PHP MVP; don't add more accents.)
- Fonts: Playfair Display for headings, Inter for UI. Both load via `next/font` in `app/layout.jsx` (CSS vars `--font-inter`, `--font-playfair`; Urdu uses Noto Naskh via the marketing layout).
- Calm, premium, Apple-keynote feel. No generic gradient cards, no AI-template look.
- Marketing CSS lives in `app/(marketing)/marketing.css`, namespaced under `.nz-home`, and must never leak into the dashboard. Marketing pages live in the `app/(marketing)` route group; copy is in `lib/marketing-content.js`, the Founding Schools offer in `lib/offer.js` (no prices until the owner adds them), site constants and legal TODOs in `lib/site.js`.
- Reuse `components/ui/*` and `components/layout/*` before creating new components.

## Security rules (non-negotiable)

- School-scoped queries go through `getSchoolClient(session)` only; `school_id` comes from the session, never from the request body, URL or query string. RLS is the tenant wall, and app code still sets/filters `school_id` explicitly (defense in depth).
- The service-role key is server-only and used only in `lib/db/admin/*` and `scripts/`. Never import it into a client component or put it in a `NEXT_PUBLIC_` variable. `SUPABASE_JWT_SECRET` is equally server-only.
- Every new table gets `school_id`, RLS enabled, policies built on `app.school_id()` + `app.can()`, explicit GRANTs, and composite `(school_id, id)` foreign keys to other tenant tables.
- Every edit to marks, fees or the General Register is auditable: DB triggers write `audit_log` (add the trigger to any new auditable table).
- Never pass a request payload straight into `.update()` / `.insert()`; whitelist columns.

## Roles

Currently `superadmin`, `principal`, `teacher` (also a CHECK constraint on `users.role` in `schema.sql`). Planned: accountant, receptionist, parent, student, plus per-permission control. Don't add more hardcoded `role === 'x'` branches (Sidebar, school layout); route access through a permission map so new roles and permissions don't require touching every call site.

## SEO rules

- Marketing pages are server-rendered and use `generateMetadata` via `lib/seo.js` `pageMetadata()` (Next does not deep-merge openGraph/twitter, so always build the full set). Canonicals are on the root domain; `app/sitemap.js` and `app/robots.js` list marketing pages only.
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
- Git: session branches stay LOCAL only; never push them to origin. When tests and build pass, merge the session branch into `main` (fast-forward if possible) and push `main` only. No pull requests. If anything failed or was skipped, ask the user before merging.

Latest security/quality audit: [docs/AUDIT.md](docs/AUDIT.md).

## Security & privacy (schools trust us with children's data)

- Passwords: bcrypt hashing; rate-limit login attempts (lock after 5 failures for 15 min); signing in or out is a single, clear action.
- Least privilege: every role sees only what it needs. Teachers see only their own classes. Accountants see fees, not marks. Parents see only their own children.
- Sensitive fields (B-Form, CNIC, phone, address) are masked in lists (e.g. `42101-*****-3`) and shown in full only on the detail page, to permitted roles.
- Audit log (who, what, when, old value → new value) for every change to marks, fees, GR records, roles and school settings. Admins cannot edit the log.
- Student photos and documents go in private Supabase Storage buckets with signed URLs only. Nothing is public.
- Per-school data export (Excel/CSV) and a deletion request flow for when a school leaves.
- Security headers (CSP, HSTS, X-Frame-Options) and input validation with zod on every API route.
- No personal data in logs, URLs or error messages.
- A privacy policy page and terms page are required before launch.

## Clarity & UX (for superadmin and school users)

- Plain language, no technical jargon in the UI. Labels and printouts in English + Urdu where it matters.
- Every page has an empty state that tells the user what to do next, plus loading and error states.
- The superadmin panel shows at a glance: schools, status, plan, students count and last activity, with clear actions (activate, suspend, change plan). Every action asks for confirmation.
- A first-login setup wizard for new schools: school info → session → classes → subjects → staff → students.
- Destructive actions always confirm and, where possible, are reversible (soft delete).
