# PROGRESS

## Current state — verified 17 Nov 2026 (status recovery, branch `status-2026-11`)

Full report: `docs/STATUS-2026-11.md`. Remaining work: `docs/ROADMAP.md` (next: **Session 6**).

- **main** = Sessions 1-4 (`828b42e`), in sync with origin. **Session 5 (`session-05-app-ui`, 2 commits) is complete but NOT merged**: migration 004 is not applied on the dev DB and the founder's browser check was never recorded.
- **Built and working:** auth (lockout, session re-check), subdomain multi-tenancy, RLS (57/57), audit log triggers, marketing site, waitlist, register (closed), legal drafts, SEO; on the unmerged branch: design system, SVG logo (from `docs/brand/logo-reference.jpg`), app shell, login, principal dashboard shell, Hijri setting.
- **Not built:** every school module (staff, sessions, classes UI, students/GR, import, SLC, attendance, alerts, exams, marksheets, fees, parent portal, notices, homework, ID cards), the superadmin schools panel, deployment. `lib/db/students.js` and `lib/db/classes.js` helpers exist without pages or APIs. Roughly 20% of the web product.
- **Health (17 Nov):** `check:db` FAIL (only `school_settings.hijri_offset`, migration 004); `test:tenant` 57/57, `test:waitlist` 19/19, `test:app` 19/19, `test:unit` 13/13, `test:pdf` pass, `test:nav` 15/15, lint 0 errors / 5 warnings; `build` passes but the first run on a machine stops with `SecurityFatalError` (Next 16.4.0 advisory); `npm audit` 10 (1 critical `next`, 1 high `zod`, 8 moderate).
- **Migrations on the dev DB:** schema (001), 002, 003 applied; **004 not applied**. No migration tracking.
- **Risks now:** Next 16.4.0 critical advisory, reachable through `images.remotePatterns` (`*.supabase.co` public) in `next.config.js`; zod 4.6.5 high advisory; no CI; no error monitoring; no production DB/backups; manual migrations.
- **Corrections to older entries below:** Session 4's "every Next.js advisory is gone" was true then; new advisories since make `next` critical again. Session 3's static brand PNGs were replaced by `next/og` routes in Session 4. Test scripts default to port 3100; on this machine 3100 is used by another project, so set `TEST_BASE` (e.g. `http://localhost:3101`).

### Next session
Session 6 in `docs/ROADMAP.md`: run migration 004, browser-check and merge Session 5, upgrade `next` to 16.4.6 and `zod` to ≥4.6.6, narrow `images.remotePatterns`.

---

## Session 5 — app UI redesign (branch `session-05-app-ui`, NOT merged yet: waiting for the founder's browser check)

### Done
- **Design system** (`docs/DESIGN.md`, dev-only preview at `/design`, 404 in production): warm-neutral tokens in `app/globals.css` + Tailwind, terracotta as the only accent, muted semantics (all text pairs >= 4.5:1), Inter for UI, Playfair only for page titles and big numbers.
- **Components** (`components/ui`): Logo, Button (primary terracotta / secondary / ghost / danger, loading, pressed state), Input / PasswordInput / Select / Textarea, Card, Badge, Alert, Modal (focus trap), Menu, DataTable (sortable, sticky header, comfortable/compact density remembered per user, skeleton + error states, phone cards), EmptyState, ErrorState, PageHeader, StatCard / GlanceList, Skeleton, Tabs, Toast.
- **Logo**: hand-built SVG from `docs/brand/logo-reference.jpg` (`lib/brand-mark.mjs`, one geometry source). Full mark >= 48px, simplified mark below that and for the favicon / Apple icon / social card. Variants: mark, horizontal, stacked, reverse, one-colour; optional tagline (off). Placeholder "N" and the graduation cap are gone everywhere (marketing, app, login, icons).
- **App shell** (`components/shell/AppShell.jsx`, wired in `app/(dashboard)/school/layout.jsx` and `app/admin/layout.jsx`): light warm sidebar showing the school's own name/logo, grouped permission-driven menu (`lib/nav.mjs`; unbuilt modules hidden via `built: false`), collapsible on desktop, drawer on mobile, topbar with breadcrumb, session pill, Ctrl/Cmd+K search stub, profile menu, "Powered by Nizamo". Super admin uses the same shell (Dashboard, Waitlist).
- **Dashboard** (`components/dashboard/PrincipalHome.jsx`, `lib/db/dashboard.js`): time-aware greeting (Pakistan time), Gregorian + Hijri date, "Today at a glance" built only from facts that exist (links only to built pages), "Set up your school" checklist (session, classes, subjects, staff, students; unbuilt steps say "Coming soon"), recent activity in plain language from `audit_log` (principal only), empty / loading / error states.
- **Hijri date adjustment**: `school_settings.hijri_offset` (-2..+2, default -1), editable at `/school/settings` (principal) via `PATCH /api/school/settings` (zod strict whitelist, `settings.write`, RLS + audit trigger). **Migration `supabase/migrations/004_hijri_offset.sql` must be run in the Supabase SQL editor** (also added to `schema.sql`). Until then the app uses -1 and saving shows a friendly error; `npm run check:db` reports the missing column.
- **Login**: `LoginView` (school identity panel with the school's logo or initials monogram and a 3%-opacity pattern from the logo's lines; form with show/hide password, inline errors, lockout message, "Forgot password? Contact your school admin", Urdu line, "Powered by Nizamo"). `LoginForm` keeps the same NextAuth sign-in.
- **Waitlist page** rebuilt with the new components. Old `Sidebar` / `Topbar` / `DashboardLayout` deleted.
- Shared money formatter (`lib/utils/money.mjs`, Pakistani grouping, Rs. 18,40,000) behind `formatCurrency` / `formatNumber`; `lib/utils/dates.mjs` (Pakistan-time helpers); `initials()` fixed (audit L10).

### Verification
`npm run build`, lint (0 errors), `test:unit` 13/13, `test:pdf`, `test:tenant` 57/57, `test:waitlist` 19/19, `test:nav` 15/15, new `test:app` 19/19 (settings API 401/403/400 cases, per-role menus and blocks). `check:db` fails only on `school_settings.hijri_offset` until migration 004 is run. Live Chrome run (login as principal and super admin, wrong-password state, settings, waitlist) at 1366 and 360px: no horizontal overflow, no console errors beyond the expected 401.

### Decisions / notes
- Security behaviour unchanged: same NextAuth sign-in, `requireSession`, `getSchoolClient`, RLS. New API route follows the same pattern.
- The pending-approvals nav badge query was dropped from the layout (the module is not built; it returns with Exams + approvals).
- Hijri: Umm al-Qura tables shifted by the school's adjustment.
- `AppShell` accepts either `icon` components (preview) or `iconName` (server layouts).
- Dev helpers: `scripts/design-shots.mjs`, `scripts/shot-one.mjs`, `scripts/shot-app.mjs` (screenshots through real Chrome).

### Known issues / next
- Run migration 004 (SQL editor) before using the Hijri setting.
- CSP still report-only; enforce after the homepage redesign.
- Modules still to build per the roadmap; the dashboard and menu fill in as they land.

---


## Session 4 — framework upgrade (branch `session-04-upgrade`)

### Done
- Next 14.2.35 → **16.4.0**, React 18 → **19.3.0**, eslint-config-next 16.4.0 + ESLint 9, `@react-pdf/renderer` 3 → **4.9**, `lucide-react` bumped (old peer range excluded React 19). next-auth stays on 4.24.15 (its peer range includes Next 16 / React 19; confirmed by a live login).
- Codemods used: `next-async-request-api` (login page, admin waitlist page, waitlist `[id]` route) and `middleware-to-proxy` (`middleware.js` → `proxy.js`). Comments/docs updated.
- `next lint` is gone in Next 16: `npm run lint` is now `eslint .` with a flat config (`eslint.config.mjs`); this also closes audit L7. React 19's new `react-hooks/set-state-in-effect` rule is set to **warn** (2 existing forms trip it; revisit per module).
- `next/og` works on Windows now: OG/Twitter/icon/apple-icon are `app/*.jsx` routes backed by `lib/brand-image.jsx`; the satori/resvg script, `npm run brand:images`, those two dependencies and the static PNGs are removed. `@fontsource/playfair-display` stays (font source).
- New `npm run test:pdf` renders a tiny PDF with react-pdf v4 (passes).
- **Bug fixed: blank homepage after client-side navigation** (from /register, /privacy, browser Back). Cause: `MarketingEffects` lives in the marketing layout, which persists across routes; it ran once, set `data-reveal` on the persistent `.nz-home` root and never removed it, so the freshly mounted homepage sections (no `in` class) stayed at `opacity:0`. Fix: the effect re-initialises on every pathname change and removes `data-reveal` on cleanup, so the hidden state only exists while it is live. The IntersectionObserver became a scroll sweep (reveals anything at or above the viewport edge, and everything at page end), because fast scrolling or a hash jump could skip past the observer and strand a section.
- New `npm run test:nav` (playwright-core + installed Chrome/Edge, run against a dev server on :3100): navigates client-side from /register and /privacy via the logo, `/#waitlist` and Back, and asserts content is visible and nothing stays hidden after scrolling. 15 checks; on the old code it fails with 20 hidden sections.
- CSP stays report-only; enforcing is postponed until after the homepage redesign. `AGENTS.md` (written by the Next 16 dev server) is in `.gitignore`.
- `npm audit`: 14 → 9 (0 critical). Remaining are Tailwind 3 / eslint-config-next build-time chains, listed in `docs/AUDIT.md` as known/low risk. *(Outdated as of 17 Nov 2026: 10 findings incl. a critical `next` and a high `zod` advisory; see the current-state section.)*

### Verification
`npm run build` (Turbopack), `npm run lint` (0 errors), `test:unit` 5/5, `test:pdf`, `check:db`, `test:tenant` 57/57, `test:waitlist` 19/19. Live on the dev server with `NEXT_PUBLIC_ROOT_DOMAIN=nizamo.test`: `ghs.` host shows the GHS login; unknown host 404; `www` 308 to apex; school `/` → `/login`; wrong password 401, right password gives a session with the correct role/school; dashboard 200 on own host, redirect to `/signed-out?reason=wrong-school` on another school's host; no session → login.

### Decisions / notes
- Tailwind 4 skipped on purpose. `next dev` refuses a second server in the same folder (use one at a time). Next 16 dev writes an `AGENTS.md`; not committed (`agentRules` could disable it).

### Next session
Roles expansion (roadmap module 1).

---


## Session 3 — marketing site, register, waitlist, legal, technical SEO (branch `session-03-marketing`, merged to main)

### Done
- Git housekeeping: origin already had Sessions 1-2 via merged PRs; merged into local main and pushed (`e4b0553`), deleted the two remote session branches. New rule in CLAUDE.md: session branches stay local, merge to main and push main only, no PRs.
- Brand: "Nizamo" everywhere (metadata, login, sidebar, package name, README). Every URL derives from `NEXT_PUBLIC_ROOT_DOMAIN` (production `getnizamo.com`) via `lib/site.js`.
- Homepage (audit H8): server component in `app/(marketing)`, sections in order: hero ("Pakistan ka school, Pakistan ka system"), pain to solution, modules, why Nizamo, Founding Schools offer, FAQ, waitlist form, footer. Inter + Playfair via `next/font`; content visible without JS; progressive reveal respects reduced motion; no counters/orbs; palette tokens only; mobile first (2.1 kB page JS, 98 kB first load). Modules are labelled "In development" (honest). Offer copy lives only in `lib/offer.js` (no prices/numbers yet).
- Waitlist: migration `003_waitlist.sql` (RLS on, no policies, API roles revoked, unique normalised WhatsApp); `POST /api/waitlist` (zod, PK phone normalisation to +923XXXXXXXXX, honeypot, 5/h/IP limit, duplicate check, admin-client insert); form success state in English + Urdu; `/admin/waitlist` (superadmin: filters, status change, CSV export with formula-injection protection).
- Register: `/register` rebuilt (live address check via `/api/schools/available`, zod, bcrypt, `register_school()`); gated by `NEXT_PUBLIC_SIGNUP_OPEN` (false = Founding Schools page, noindex, CTAs go to the waitlist). Tested open: validation, reserved/duplicate address, school + principal + settings created, new principal can sign in.
- Unknown subdomain: clean 404 ("This school isn't on Nizamo yet"); `www` to apex 308; a school's own `/` goes to login; all school addresses noindex; internal existence check guarded by a secret header.
- Legal: `/privacy` and `/terms` in plain English, visible "Draft — to be reviewed before launch" banner, operator name/address are marked TODO (`lib/site.js`), linked from footer and register page.
- Technical SEO (marketing pages only): `pageMetadata()` per page, root-domain canonicals, Open Graph + Twitter large-card tags, static brand OG/Twitter/icon PNGs (`npm run brand:images`), `sitemap.js`, `robots.js` (disallows /school, /admin, /login, /signed-out, /api), JSON-LD Organization + SoftwareApplication (EducationalApplication) + FAQPage (matches visible FAQ), lang attributes, one h1 per page, no images without alt, `X-Robots-Tag: noindex` on private routes and school subdomains.

### Verification
- `npm run build` passes; `npm run test:unit` 5/5; `npm run test:waitlist` 19/19; `npm run test:tenant` 57/57 (re-run after the middleware changes).
- Live checks with a dev server (host headers): robots, sitemap, canonical/OG/Twitter tags, JSON-LD parses (3 types, 6 FAQ entries = 6 visible), subdomain routing, security headers; admin page, filter, CSV, status change as superadmin; principal refused (307/403).
- NOT verified: visual rendering in a real browser (no browser tool in this session), Google Rich Results, mobile device testing. See "How to verify SEO" below.

### How to verify SEO after deploy (Lighthouse is not proof)
1. View source of `/`: one `<h1>`, `<title>`, meta description, `<link rel="canonical" href="https://getnizamo.com">`, `og:*` and `twitter:*` tags, three JSON-LD types.
2. Paste the live URL into Google's Rich Results Test and the Schema Markup Validator (FAQPage should validate; SoftwareApplication has no `offers` yet, so no rich result is expected).
3. Fetch `/robots.txt` and `/sitemap.xml`; confirm only marketing URLs are listed.
4. `curl -I https://ghs.getnizamo.com/login` shows `X-Robots-Tag: noindex, nofollow`; an unknown subdomain returns 404.
5. Add the domain to Google Search Console, submit the sitemap, use URL Inspection on `/`, and watch Coverage for school subdomains (should stay excluded).
6. Share the URL in WhatsApp/Twitter debuggers to check the social card.

### Decisions
- Static pre-rendered PNGs instead of `next/og` (Windows build bug in Next 14.2). Sitemap/robots are `.js` (project is JavaScript).
- `/api/schools/available` added for registration (the old check endpoint only finds active schools).
- In-memory rate limits (waitlist, register, availability) are per server instance; move to Redis/Upstash when running multiple instances.
- Register has no email verification yet, another reason signup stays closed.

### Known issues / to do before launch
- Fill the TODO operator name and address in `lib/site.js`; have a lawyer review `/privacy` and `/terms`; remove the draft banner then.
- Add Founding Schools numbers in `lib/offer.js` when decided.
- CSP is still report-only; Next.js advisories needing Next 16 remain; dashboard still has its older palette (M11), hard-coded academic year (M9), M3/M7/M8.
- `www.<root>` and wildcard `*.<root>` DNS plus a wildcard TLS certificate are needed in production.

### Next session
Roles expansion (roadmap module 1): add accountant, receptionist, parent and student users and nav, a role/permission admin view, then the Students + General Register module.

---

## Session 2 — security + foundation (branch `session-02-security`)

### Done
- Dependencies: Next 14.2.35, next-auth 4.24.15, `zod` and `server-only` added, unused `@supabase/ssr` removed. Remaining `npm audit` items are Next.js advisories fixed only in Next 16 (major jump, not done).
- Real tenant isolation (RLS-backed):
  - `lib/supabase/school.js` `getSchoolClient(session)` signs a 10-min HS256 JWT (`role=authenticated`, `sub`, `school_id`, `app_role`) with `SUPABASE_JWT_SECRET`; all school-scoped queries use it.
  - Service-role client only in `lib/db/admin/*` (`server-only`): login helpers, public school lookup, `register_school`, superadmin functions behind `assertSuperadmin` (checked against the DB).
  - Migration `supabase/migrations/002_rls_and_hardening.sql`: policies on every table; `app.school_id()` returns a school only if user AND school are active (suspension cuts access in the DB); role is read from the DB; permissions in `role_permissions` (`lib/auth/permissions.mjs` mirrors it, test verifies); `user_students` for parent/student links; composite `(school_id, id)` FKs; `password_hash` unreadable by API roles; students soft-deleted; atomic GR numbers + unique index; append-only `audit_log` with triggers (never stores password hashes); `login_attempts`; `register_school()`.
  - `lib/db/*` refactored: no `schoolId` arguments; `updateStudent` is zod `.strict()` whitelist; masked sensitive fields in lists (`lib/utils/mask.js`); search input sanitized; teacher assignments saved without a delete-all window; bulk import batched.
- Auth hardening: 24h sessions, per-request cached active check (`lib/auth/session.js`), `/signed-out` page, lockout after 5 failures for 15 min, emails lowercased, constant-time-ish unknown-user path, middleware host/school mismatch check, exact host parsing via `NEXT_PUBLIC_ROOT_DOMAIN`, login page reads the school from the host header.
- Demo logins only with `NEXT_PUBLIC_DEMO_MODE=true`; unique strong passwords per account (`npm run demo:passwords`); superadmin shortcut never in production.
- Security headers (HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy, CSP **report-only**), `X-Robots-Tag: noindex` on `/school`, `/login`, `/signed-out`, `/api`; `/api/schools/check` zod + rate limit.
- Proof: `npm run test:tenant` 57/57 passed on the dev project; `npm run check:db` passes; `npm run build` passes; no secret found in client bundles; live login/lockout/mismatch smoke test passed. The SQL was also validated in an in-memory Postgres (50/50) before applying.
- CLAUDE.md updated for the new architecture; `docs/AUDIT.md` items marked.

### Decisions
- `app_role` claim carries the role; Postgres role claim is `authenticated`. The database re-reads the role, so the claim is informational.
- Migration run only on the dev project. **Production order:** (1) `supabase/schema.sql`, (2) `supabase/migrations/002_rls_and_hardening.sql`, (3) never `seed.sql`; create the real super admin out of band with a strong password. Set `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`; leave `NEXT_PUBLIC_DEMO_MODE` unset.
- Superadmin keeps using the admin client (no tenant permissions in `role_permissions`).

### New env vars
`SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_DEMO_MODE`, `DEMO_PASSWORD_PRINCIPAL`, `DEMO_PASSWORD_TEACHER`, `DEMO_PASSWORD_SUPERADMIN` (all in `.env.local.example`).

### Known issues / not done
- Next.js advisories requiring Next 16 remain (no Image Optimizer, Server Actions or rewrites are used, which limits exposure).
- CSP is report-only; switch to enforcing (nonces) before launch.
- Login lockout is per account; no per-IP limit. The `/api/schools/check` limiter is per server instance.
- Audit log triggers cover users, students, results, school_settings, fee_*, schools, user_students (not attendance/homework).
- Test schools leave their audit rows behind (the log is append-only by design).
- Open mediums: M3 (first-login password change / reset), M7 (approvals count loads rows), M8 (UTC vs Pakistan dates in app code), M9 (hard-coded academic year defaults), M11 (palette/Inter/branding drift), M12 (homepage claims). Dashboard pages beyond the placeholder do not exist yet, so role checks are only exercised by tests.
- Marketing homepage on an unknown subdomain still renders the homepage (Part 3).
- Consider moving off the legacy JWT secret to asymmetric signing keys before production hardening.

### Next session (Part 3)
Homepage fixes (server component + `generateMetadata`, Inter via `next/font`, brand name), register page using `registerSchool`, waitlist form + `waitlist` table (with RLS), privacy/terms placeholders, then the Roles expansion module from the roadmap.
