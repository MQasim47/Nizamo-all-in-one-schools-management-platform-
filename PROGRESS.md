# PROGRESS

## Session 7 — safety net: CI, migrations, error monitoring, API pattern (branch `session-07-safety`, 18 Nov 2026)

### Done
- **CI** (`.github/workflows/ci.yml`, docs in `docs/CI.md`, badge in README). It runs on every push and PR to main.
  - `checks` job: `npm ci`, lint, `test:unit`, `test:pdf`, build (placeholder env values).
  - `database` job: throwaway local Supabase via the Supabase CLI (`ci/supabase/config.toml`). It runs `npm run migrate` on an empty database, a second migrate that must say "Nothing to apply", `db:status`, `test:tenant` (real Supabase roles, PostgREST, RLS) and `test:migrate`.
  - Safety: no repository secrets, so CI cannot reach dev. The runner refuses non-local databases when `CI` is set.
- **Migration tracking**
  - `supabase/schema.sql` moved to `supabase/migrations/001_schema.sql` (git mv).
  - `npm run migrate` / `npm run db:status` (`scripts/migrate.mjs`, `pg`). One transaction per file plus its `schema_migrations` row (sha256 checksum, CRLF-insensitive). Advisory lock; lock and statement timeouts.
  - It refuses edited or missing applied files and out-of-order numbering.
  - `--baseline NNN` records a hand-built database after probing that the objects exist. `--dry-run` and `--status` change nothing.
  - Standalone `BEGIN;`/`COMMIT;` in old files (002, 003) are removed in memory, so each file and its record commit together.
  - `check:db` now fails when the dev DB is behind the repo or a checksum differs.
- **Migration 005** (`005_api_foundation.sql`): `idempotency_keys` (school + user scoped RLS, column-level grants, 24 h expiry), and audit **L11**: `users.school_id NOT NULL`.
- **Sentry** (`@sentry/nextjs` 11.14, free plan): `instrumentation.js`, `instrumentation-client.js`, `app/global-error.jsx`. Off without `NEXT_PUBLIC_SENTRY_DSN`.
  - Privacy settings: `sendDefaultPii: false`, no Replay, tracing 0 by default.
  - `lib/monitoring/scrub.mjs` strips the user, cookies, bodies, query strings and unknown headers. It replaces emails, phones, CNIC/B-Form, tokens and DB `Key (x)=(value)` details in messages, breadcrumbs, extra data and stack-frame code lines, and drops frame variables.
  - CSP `connect-src` allows Sentry ingest. Superadmin `GET /api/v1/admin/monitoring-test` throws on purpose.
- **API pattern** (`docs/API-PATTERN.md`, with copy-paste route/service/validation/migration/test templates).
  - Building blocks: `lib/api/errors.mjs` (envelope + Postgres error mapping incl. our `NZ4xx` codes), `handler.js` (`api()`, Sentry for unexpected errors only, `no-store`), `auth.js` (`requireAuth` with a bearer path that returns 401 until Session 8, `requirePermission`, `requireSuperadmin`), `parse.mjs` (400/413/415/422 with `fields`), `idempotency.mjs` + `idempotency-store.js`, `db.mjs` (`unwrap`, `callRpc`), `pagination.mjs`, `enforceRateLimit`.
  - Money: `formatRs` is the one formatter and now shows whole rupees only; added `toRupees`, `sumRupees` and `rupeesSchema`.
  - Dates: `isValidDate`, `toPkDate`, `addDaysPk`, `pkDayRange`, `pkDateSchema`. A lint rule blocks `toISOString().split/slice`; it caught one case in the waitlist CSV filename, now fixed.
- **Reference endpoints**:
  - `POST /api/waitlist` → `POST /api/v1/waitlist` (`lib/services/waitlist.js`).
  - `PATCH /api/school/settings` → `GET`/`PATCH /api/v1/settings` (`lib/services/settings.js`, `lib/validation/settings.mjs`).
  - Old paths removed; forms updated to the envelope (validation is now 422 with `error.fields`). `requireApiSession` (older routes) returns the envelope too.
- **L9**: `getShellSettings` no longer hides DB errors. Dashboard blocks that fail still show their own error state and are reported to Sentry.
- **Roles docs**: CLAUDE.md "Roles" now lists the 7 roles the DB allows; `001_schema.sql` comments point to 002 (7 roles) and 005 (NOT NULL).
- **Privacy policy draft**: new "Error monitoring" section covering Sentry, what is filtered, what a report keeps, EU storage and 30-day deletion. Also listed among service providers.
- **Tests**:
  - Unit tests 21 → **58**: `tests/api.test.mjs`, `money-dates.test.mjs`, `scrub.test.mjs`, `migrations.test.mjs`.
  - `scripts/test-api.mjs` (`npm run test:api`, the per-module template). `test-tenant` §8 adds 12 checks: idempotency keys cross-school/cross-user, `schema_migrations` hidden, L11.
  - `scripts/test-migrate.mjs` (23 checks). Settings API checks moved from `test:app` to `test:api`. `test:app` uses environment variables over `.env.local`.

### Verification (18 Nov 2026)
- Lint 0/0; `test:unit` 58/58; `test:pdf` pass; `npm run build` pass.
- On the local CI stack (Docker, the same steps as the workflow): migrate 001–005 on an empty DB; second run "Nothing to apply"; `db:status` clean; `test:tenant` **69/69**; `test:migrate` **23/23**.
- Same local stack + `seed.sql` + dev server on 3101: `test:api` 23/23, `test:waitlist` 21/21, `test:app` 12/12, `test:nav` 15/15, `check:db` all passed (incl. the migration check).
- Sentry end to end: DSN pointed at a local capture listener, then the monitoring-test route was triggered. The event arrived, the message read `[email] [phone]`, and the payload contained no email, phone, user, cookie, IP or query string. The first run found the test literal in Sentry's source-code context lines; the scrubber now cleans those, with a regression case in `scrub.test.mjs`.
- **Not run yet against the dev project**: 005 is not applied on dev (needs `DATABASE_URL`, founder step). So `check:db`, `test:tenant`, `test:api`, `test:waitlist` and `test:app` against dev wait for that.

### Decisions
- CI uses a local Supabase (CLI 3.2.0, Postgres 17) instead of a hosted test project: free, real Supabase roles, no secrets.
- 001 lives in `supabase/migrations/` so one folder holds the whole history. Comment edits to 001 were made before its checksum is recorded (baseline).
- Validation errors are 422 (malformed requests 400), per the API rules; the waitlist form and tests follow.
- Idempotency keys are per user and expire after 24 h. Money endpoints must ALSO keep a unique key on the business table inside the same RPC (documented).
- No source-map upload to Sentry yet (needs a Sentry auth token; optional later).

### Known issues
- **`npm audit`: 22 high** (main had 19). Cause: a new picomatch ReDoS advisory (GHSA-fc5q-39xc-vjpf) that affects every picomatch version (≤4.0.7, no patched release). It comes in through ESLint (`eslint-config-next`), Tailwind 3 and, new, Sentry's build plugin (`@rollup/plugin-commonjs`). These are build-time glob matchers that never see user input. `npm audit fix --force` would downgrade Sentry to v8. Apply the fix as soon as picomatch ships one.
- Older routes (`/api/register`, `/api/schools/*`, `/api/admin/waitlist/*`, `/admin/waitlist/export`) are not on `/api/v1` yet; move them when their module is touched.
- `migrate` connects with TLS but does not verify the server certificate unless `DATABASE_SSL_CA` is set (optional founder step).

### Next
Founder steps (DATABASE_URL + baseline + migrate 005, Sentry project), then re-run the local live tests against dev. Then Session 8 (bearer tokens / `device_sessions`, password reset, phone identity) per `docs/ROADMAP.md`.

---

## Session 6 follow-up — founder's browser-check fixes (18 Nov 2026, merged into main)

### Done
- **Data-entry positioning**: the "free data setup" claim is gone (hero note, Founding Schools perk in `lib/offer.js`, FAQ in `lib/marketing-content.js`). New line: self-import with our Excel template is free; done-for-you entry of existing registers is a paid one-time service quoted by school size (no prices on the site). The FAQ "Do we have to type everything again?" says this and that scanning register pages is coming.
- **Super admin sidebar** shows the Nizamo logo mark instead of "NA" initials (`brand.mark: 'nizamo'` in `app/admin/layout.jsx`, handled in `AppShell` `SchoolMark`).
- **Bug fixed: teacher dashboard counted the whole school.** Teachers hold `classes.read`, so "Attendance today" for Ahmed Khan showed "0 of 2" (all classes) instead of his own. Now `lib/dashboard/attendance-glance.mjs` (pure) scopes the numbers to `teacher_assignments` for anyone without `attendance.read_all`. Tests: `tests/attendance-glance.test.mjs` (8 table-driven cases) and two live checks in `test:app` (teacher sees only assigned classes; principal sees all). The live check was run against the old code first and failed ("shown: 2"), then passed with the fix.
- **Edu4Everyone renamed to Nizamo** in seed data, schema header, login demo shortcut, demo-password script, screenshot script, README, CLAUDE.md and `.env.local`. Super admin is now **`admin@nizamo.test`**, school "Nizamo Admin". Dev DB updated (school name/email + user email) and `npm run demo:passwords` re-run (new passwords in `.env.local`). `docs/AUDIT.md` and older PROGRESS entries keep the old name as history.
- **ROADMAP**: new Session 13b "Scan import (AI-assisted)" right after the Excel import session: photo → AI extraction → human review of every field with confidence flags, nothing auto-saves, images deleted after extraction (privacy policy disclosure), internal tool first then paid add-on, provider is config, cost tracked per page. Planned only, not built.

### Verification (18 Nov 2026, dev server on 3101)
`npm run lint` 0 errors 0 warnings; `check:db` all passed; `test:unit` 21/21; `test:app` 22/22; `test:waitlist` 19/19; `test:tenant` 57/57; `test:nav` 15/15; `test:pdf` pass; `npm run build` pass; `npm audit` 0. Super admin signs in as `admin@nizamo.test` and reaches `/admin/waitlist`.

### Decisions
- Scan import is numbered 13b so later session numbers (and references to them) stay the same.
- The Founding Schools perk is now "Bring your existing records with you" (free template import, or paid team entry), so the offer still lists four perks.

### Known issues / next
- Super admin's fresh seed still ships the shared weak seed password until `npm run demo:passwords` runs (unchanged behaviour).
- Privacy policy must disclose scan-image deletion when Session 13b is built.
- Next: Session 7 (reliability foundation) per `docs/ROADMAP.md`.

---

## Session 6 — close out Session 5 + security patches (branch `session-05-app-ui`, merged into main 18 Nov 2026)

### Done
- Migration 004 applied on dev by the founder; `check:db` all green.
- Merged main (status-recovery docs) into `session-05-app-ui`; PROGRESS.md conflict resolved with main's version (it already carried the Session 5 entry).
- **CLAUDE.md**: added "Definition of Done" and "Reliability rules" exactly as proposed in `docs/STATUS-2026-11.md` §6; new "Architecture rules" section with the four mobile decisions (API-first `lib/services/*` + `/api/v1`; phone-number identity for parents; one family/guardian model; one notification outbox); test port rule (3101 default, `TEST_BASE` override, never touch 3100); pointer to `docs/ROADMAP.md`.
- **Security**: `next` 16.4.0 → **16.4.6**, `eslint-config-next` → 16.4.6, `zod` 4.6.5 → **4.6.7**, `npm audit fix` (lockfile only, no major bumps) → **0 vulnerabilities**.
- **`images.remotePatterns` removed** from `next.config.js` (not narrowed): no file uses `next/image`, and school images must come from private storage via signed URLs, so the image optimizer should fetch nothing remote. Comment explains: if ever needed, allow only our project host from `NEXT_PUBLIC_SUPABASE_URL`.
- **Lint 0 warnings**: the 5 `set-state-in-effect` warnings fixed: new `lib/hooks/use-stored-value.js` (`useSyncExternalStore` over localStorage with memory fallback) for sidebar collapse (`AppShell`) and table density (`DataTable`); drawer closes on navigation by adjusting state during render; Ctrl/⌘ label via `useSyncExternalStore`; `RegisterForm` derives availability from the last answer instead of setting state in the effect; `WaitlistForm` reads UTM source at submit time.
- Test scripts and screenshot helpers default to `http://localhost:3101` (`TEST_BASE` overrides).

### Verification (17 Nov 2026)
Clean state (`.next` and `node_modules/.cache` deleted) → `npm run build` passes on the **first** run, no security stop. `check:db` all passed; `test:tenant` 57/57; `test:waitlist` 19/19; `test:app` 19/19; `test:unit` 13/13; `test:pdf` pass; `test:nav` 15/15 (all on the default port 3101); `npm run lint` 0 errors 0 warnings; `npm audit` 0. Browser smoke (real Chrome, dev server with `NEXT_PUBLIC_ROOT_DOMAIN=localhost`): `/design` 200; `ghs.localhost:3101/` → GHS login; unknown subdomain 404; principal and teacher sign in on the subdomain; dashboard greeting, Gregorian + Hijri date, glance and activity render; no console errors; 360px: no horizontal overflow, drawer opens; superadmin via `admin.localhost:3101` and `localhost:3101/login?school=admin` reaches `/admin/waitlist`.

### Known issues / next
- Founder browser check done (18 Nov): UI approved; follow-up fixes below, then merged.
- Topbar session pill shows "Session 2025–2026" (hard-coded academic year, audit M9) — fixed by the academic sessions work (ROADMAP Session 10).
- `CLAUDE.md` "Roles" section and `schema.sql:35` still describe 3 roles (migration 002 allows 7); fix with the staff/roles session.
- Dev console notes `scroll-behavior: smooth` on `<html>` without `data-scroll-behavior` (cosmetic).
- Next: Session 7 (reliability foundation) per `docs/ROADMAP.md`.

---

## Status recovery — verified 17 Nov 2026 (branch `status-2026-11`, merged)

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
