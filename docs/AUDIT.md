# Nizamo audit — Session 1 (status updated in Session 2)

Read-only audit of the repo at commit `57437a3` (branch `main`). No application code was changed in this session. Findings are by severity; each has `file:line` and a suggested fix.

**What was and wasn't verified**
- `npm run build` passes (7 routes, no type or lint errors; `next lint` has no ESLint config, see L7).
- `npm audit --omit=dev` reports 8 vulnerabilities (2 critical, 3 high, 1 moderate, 2 low).
- The live database could not be reached: the Supabase host in `.env.local` does not resolve (DNS ENOTFOUND) while general internet works. Most likely the free project is paused or deleted, or the URL is wrong. Restore it in the Supabase dashboard, then run `npm run check:db`. Everything below about the schema is therefore from static comparison, not a live check.
- Not found in this repo, although the session brief lists them as done: a `/register` page (with live subdomain check) and a waitlist form. The homepage links to `/register` four times (see H8).

## Schema vs code (static comparison)

- Every table and column the code reads or writes exists in `supabase/schema.sql`. Nothing is referenced-but-missing.
- Tables in the schema that no code touches yet: `attendance`, `homework`, `fee_types`, `fee_structures`, `fee_payments` (expected; modules not built).
- Missing for the roadmap: audit log table, waitlist table, family/guardian accounts, user-to-student links for parent/student roles, `UNIQUE(school_id, gr_number)` on `students`.
- `users.role` CHECK allows only `superadmin`, `principal`, `teacher` (`supabase/schema.sql:35`).
- RLS is enabled on all 13 tables but no policies exist (`schema.sql:260-272`). That means deny-all for the anon key (safe) and full bypass for the service role (what the app uses). Because auth is NextAuth, not Supabase Auth, `auth.uid()` is unavailable, so per-school policies need a Supabase-compatible JWT carrying `school_id` (the `jose` dependency is already installed) or the app must stay service-role-only and rely on app-level filtering.

## Session 3 status

H8 and H2 are fixed, along with M11 (marketing site and fonts), M12 and L1-L3. The homepage is now a server component with per-page metadata, content is visible without JavaScript, Inter/Playfair load through `next/font`, and unknown school addresses show a 404. Still open: M3, M7, M8, M9, the dashboard side of M11, and the other lows.

## Session 2 status

All CRITICAL and HIGH items are fixed except H8 (homepage/register/waitlist, deferred to Part 3) and the parts noted in brackets. Proof: `npm run test:tenant` (57 checks, including every table cross-school) plus a live login/lockout smoke test. Mediums still open: M3, M7, M8, M9, M11, M12 and the lows not marked. `check:db` now passes against the restored project (the Session 1 "DB unreachable" note is resolved).

---

## CRITICAL

**C1. [FIXED (patched to Next 14.2.35 / next-auth 4.24.15; pages and APIs now re-check the session server-side; remaining Next advisories need Next 16, a major jump)] Next.js 14.2.5 and next-auth 4.x have known critical advisories; middleware is the only auth gate for `/school/*`.**
`package.json:13` (next 14.2.5) lists, among others, a Next.js authorization-bypass advisory (GHSA-7gfc-8cq8-jh5f), cache poisoning, and middleware-redirect SSRF. `package.json:18` (next-auth ^4.24.7) is flagged critical (GHSA-7rqj-j65f-68wh and two more). `middleware.js:31-45` is the only protection for dashboard routes. `app/(dashboard)/school/layout.jsx:10-12` re-checks the session, which saves pages rendered under that layout, but any future route handler under `/api` has no layout and would rely on middleware alone.
Fix: upgrade to the latest 14.2.x (`next@14.2.35` per `npm audit`), bump next-auth to the latest 4.x, run `npm audit fix`. Add a `requireSession()` helper and call it in every route handler and server action; never rely on middleware alone.

**C2. [FIXED] Demo credentials with password `password` are shown on the public login page and seeded for every environment, including the super admin.**
`app/(auth)/login/page.jsx:216-252` (always rendered, one-click fill) and `supabase/seed.sql:16-61` (one shared bcrypt hash for superadmin, principal and teacher). If `seed.sql` is run against a production project, anyone can sign in as `superadmin` at `/login?school=admin`.
Fix: render the demo block only when `NODE_ENV !== 'production'` or `NEXT_PUBLIC_DEMO=1`; split `seed.sql` into dev seed vs bootstrap; create the real super admin with a random password out of band; force password change on first login (see M3).

**C3. [FIXED] Mass assignment in `updateStudent` lets a caller move a student to another school or overwrite any column.**
`lib/db/students.js:157-168` passes `payload` straight to `.update(payload)`. The `.eq('school_id', schoolId)` filter only scopes the row being matched; the payload may itself contain `school_id`, `id`, `status`, `gr_number`.
Fix: whitelist columns (a `pick()` of the General Register fields) and never accept `school_id`/`id` in payloads. Apply the same rule to every future update helper.

**C4. [FIXED] Cross-tenant administration functions have no authorization and the "school_id from session" rule is not enforced anywhere in code.**
`lib/db/schools.js:102-111` (`getAllSchools`), `:113-120` (`updateSchoolStatus`), `:122-129` (`updateSchoolPlan`) operate across tenants with no role check inside; the only guard would be whatever the future caller does. More broadly, every helper in `lib/db/*` trusts a caller-supplied `schoolId` argument (e.g. `students.js:7`, `classes.js:7`). One API route that forwards `body.schoolId` is a full cross-tenant breach, since the service role bypasses RLS.
Fix: make the tenant implicit. Create `getTenantDb(session)` / `requireRole(session, [...])` that derive `schoolId` from the session and are the only way route handlers reach `lib/db`; put a `superadmin` assertion inside the three functions above.

**C5. [FIXED] Sessions are never revalidated for 30 days.**
`lib/auth.js:92-95` (30-day JWT) and `:62-72` (claims copied only at sign-in). A deactivated user (`users.status`), a suspended school (`schools.status`), a changed role or an expired trial (`trial_ends`, never read) keeps full access until the token expires. `status` is only checked in `authorize()` (`lib/auth.js:25,36`).
Fix: re-check user and school status in the `jwt` callback at most every few minutes (cache `checkedAt` in the token), or shorten `maxAge` and add a server-side `session version` column; enforce `trial_ends`/suspension in the school layout.

---

## HIGH

**H1. [FIXED] Subdomain is never bound to the session (user from school A on school B's host).**
`middleware.js:16-23` computes the subdomain, but `:31-45` only checks that *a* token exists. It never compares `token.schoolSubdomain` to the host. Data stays safe (queries use the session's `schoolId`), but a school A user can sit on `b.nizamo.com/school/dashboard` and see B's branding context; this is a phishing and confusion vector. Fix: in middleware, if `subdomain && token.schoolSubdomain !== subdomain` redirect to the user's own subdomain or sign out.

**H2. [FIXED in Session 3: unknown school addresses return a 404 page, www redirects to the apex, a school's own / goes to its login] Unknown subdomains are not handled.**
`middleware.js:21-23`: any `foo.<domain>` is accepted as a "subdomain" and falls through to the marketing homepage; no 404, no redirect to the apex. Also `parts.length >= 3` treats `myapp.vercel.app` preview URLs as school `myapp`, and `hostname.includes('localhost')` (`:19`) matches hosts like `localhost.evil.com`. Fix: compare against a configured root domain (`NEXT_PUBLIC_ROOT_DOMAIN`), look the school up, 404 if unknown; use exact `localhost`/`127.0.0.1` matching.

**H3. [FIXED] The subdomain header is dead code; the login page ignores the host.**
`middleware.js:26` sets `x-school-subdomain` and nothing reads it (grep). `app/(auth)/login/page.jsx:11` reads only `?school=`. So `ghs.nizamo.com/login` with no query shows "School portal not found" (`:146-149`). In production the subdomain-per-school promise does not work yet. Fix: read the header in a server component (or pass it via the layout) and fall back to the query param only in development.

**H4. [FIXED (permission map + requireSession/requireApiSession + RLS; pages not built yet)] Role checks are not enforced server-side; only the sidebar differs by role.**
`components/layout/Sidebar.jsx:72-119` hides links; `middleware.js` has no role rules and pages have none. A teacher can open any principal URL directly (they do not exist yet, but each will need its own check). Fix: central permission map + `requirePermission('results.approve')` in every page/route; middleware can add a coarse path-to-role guard as a first line.

**H5. [FIXED (per-account lockout; per-IP limiting not added)] No brute-force protection on login; email lookup is case-sensitive.**
`lib/auth.js:15-39` has no rate limiting, lockout or CAPTCHA. `:34` matches `email` exactly, so `Principal@ghs.com` fails and also allows near-duplicate accounts (`schema.sql:40` is case-sensitive). Fix: lowercase+trim emails on write and read (or `citext`); add per-IP/per-account rate limiting (Upstash or a `login_attempts` table).

**H6. [FIXED] General Register number generation is wrong and racy.**
`lib/db/students.js:72-85` orders a TEXT column descending, so `'999'` sorts above `'1001'` and the next number becomes `1000` after GR 999. Two concurrent admissions get the same number, and there is no unique constraint (`schema.sql:108`). Bulk import (`students.js:204-238`) increments in memory. Fix: `UNIQUE(school_id, gr_number)`, a per-school counter row incremented atomically (Postgres function), numeric ordering.

**H7. [FIXED] Destructive and unaudited writes on legal records.**
`lib/db/students.js:170-178` hard-deletes a student; FKs cascade to attendance, results and fee payments (`schema.sql:159,176,244`). `updateStudent`, `markStudentLeaving` and the results flow have no audit trail. Fix: soft delete (`status = 'deleted'`/`deleted_at`) and the planned audit log before the Students module ships.

**H8. [FIXED in Session 3] Homepage links to a page that does not exist; metadata is wrong and unmanaged.**
`app/page.jsx:79,90,288,304` link to `/register`, and `middleware.js:5` lists it as public, but no `app/register` exists in the repo (and no waitlist form or table). `app/page.jsx:1` makes the entire marketing page a client component, so `generateMetadata` is impossible on it (SEO rule), and `app/layout.jsx:6-9` still says "Edu4Everyone – School Management SaaS". Fix: split the page into a server component with `generateMetadata` + a small client island for the observers; set Nizamo metadata, canonical, Open Graph, `sitemap.js`, `robots.js`.

**H9. [FIXED] Dashboard is not `noindex`.**
No `robots` metadata anywhere. `app/(dashboard)/school/layout.jsx` should export `metadata = { robots: { index: false, follow: false } }` (and `/login`).

**H10. [FIXED (atomic register_school + validation; no register page yet)] Registration is not atomic and does not validate the subdomain.**
`lib/db/schools.js:59-96`: school insert, user insert and settings insert are separate calls; if the user insert fails (`:91`) an orphan school with the chosen subdomain remains and blocks it; the settings error at `:94` is ignored. No format or reserved-name validation (`admin`, `www`, `api`, `app`, `mail`; only `www`/`localhost` are rejected at `:8`). Fix: a Postgres function (single transaction) for registration; validate `^[a-z0-9-]{3,30}$` plus a reserved list on server and client.

---

## MEDIUM

**M1. [FIXED] Service-role key: no leak today, no guard against one tomorrow.** `lib/supabase.js:5,12` is imported only by server files (`lib/auth.js:3`, `school/layout.jsx:4`, `lib/db/*`), and the key has no `NEXT_PUBLIC_` prefix, so it is not in any bundle. But the same module also builds the anon client (`:8`). A client component importing it would crash in the browser instead of leaking. Fix: split into `lib/supabase/admin.js` with `import 'server-only'`; delete the unused anon client or move it to its own file.

**M2. [FIXED] PostgREST filter injection in student search.** `lib/db/students.js:22-24` interpolates raw `filters.search` into `.or()`. Commas/parentheses/`%` change the filter. It cannot escape the `school_id` AND (so no cross-tenant read), but it can break queries or widen matches. Fix: escape or use `.ilike` per column via a safe builder.

**M3. `is_first_login` is stored and exposed but never acted on.** `lib/auth.js:55,70,82`; no forced password change flow exists, and there is no password reset (`login/page.jsx:196` links to `#`).

**M4. [FIXED] Cross-tenant foreign keys are not validated.** `students.js:95,118` (`classId`), `:200` (`bulkImportStudents`), `classes.js:173-196` (`saveTeacherAssignments` with arbitrary teacher/class/subject IDs). Only the FK exists, so school A can reference school B's class UUID. Fix: verify each referenced ID belongs to `schoolId`, or add composite FKs `(school_id, id)`.

**M5. [FIXED] `saveTeacherAssignments` is not atomic.** `lib/db/classes.js:174-195` deletes then inserts; if the insert fails the teacher loses all assignments. Fix: RPC/transaction, or upsert then delete the difference.

**M6. [FIXED] Bulk import ignores errors.** `lib/db/students.js:227-235` does not check the insert result but increments `imported`; `.single()` at `:220` returns an error (treated as "not found") if duplicates already exist; one query per row. Fix: batch insert, check errors, report per-row failures.

**M7. Pending-approvals count loads all rows.** `app/(dashboard)/school/layout.jsx:17-27` fetches every pending result row on every dashboard navigation just to count distinct triples. Fix: an SQL view/RPC with `count(distinct ...)`; also include `academic_year`.

**M8. Date handling is UTC, Pakistan is UTC+5.** `lib/db/students.js:101,147` and `lib/db/schools.js:69` use `toISOString().split('T')[0]`, so between 00:00 and 05:00 PKT the date is yesterday's. `lib/utils/format.js:33` uses local time, so the two disagree. Fix: one `todayPK()` helper (Asia/Karachi).

**M9. Academic year is hard-coded.** `'2025-2026'` in `schema.sql:49,69,184,234`, `lib/db/schools.js:96,142`, `lib/db/classes.js:52`; `format.js:37` `currentAcademicYear()` exists but is unused. Today (Oct 2026) the default is already a year stale. Fix: take it from `school_settings`.

**M10. [FIXED] Public school lookup endpoint leaks and is unthrottled.** `app/api/schools/check/route.js:4-25` returns `school_name` and `plan` to anyone for any subdomain (enumeration). `login/page.jsx:29` also does not `encodeURIComponent` the value. Fix: return only `{found, school_name}`, rate limit, encode.

**M11. [FIXED for the marketing site and fonts in Session 3; dashboard palette cleanup remains] Brand and palette drift from the design rules.**
- Two palettes: homepage `#faf8f5/#141210` (`app/home.css:2-5`) vs dashboard cream/espresso (`tailwind.config.js:12-26`); marksheet mock uses off-palette blue `#1a3a6b` (`home.css:101-103`).
- Inter is never loaded: `app/globals.css:1` imports Playfair + DM Sans, but `home.css:6` asks for Inter, so the homepage silently falls back to the system sans. Dashboard body is DM Sans (`globals.css:39`, `tailwind.config.js:29`, `app/layout.jsx:24`).
- Gradient orbs (`home.css:46-48`, `login/page.jsx:77-84`) and emoji icons (🎓 in `login:88`, `Sidebar.jsx:54`) conflict with "no generic gradient/AI-template look".
- Product name is "Edu4Everyone" in `app/layout.jsx:6`, `login/page.jsx:90,132`, `Sidebar.jsx:56`, `package.json:2`, `schema.sql:2`.
Fix: one token set, load Playfair + Inter via `next/font`, decide on the logo mark, rename.

**M12. [FIXED in Session 3: modules are labelled "In development"] Homepage marketing claims are ahead of the product.** `app/page.jsx:207-211` ("9+ connected modules", "3 dedicated portals"), the tiles at `:145-200` (marksheets, fees, attendance, "full audit trail") describe features not built (only auth and a placeholder dashboard exist). Fix: label as roadmap or trim before launch.

---

## LOW

**L1. [FIXED in Session 3]** Homepage content is `opacity:0` until JavaScript adds `.in` (`home.css:31`; `app/page.jsx:13-24`): flash of invisible content, blank for no-JS and slow hydration; no `prefers-reduced-motion` handling.
**L2. [FIXED in Session 3]** Counter animation sets `textContent` on React-owned nodes and never clears its `setInterval`s on unmount (`app/page.jsx:32-48`). Harmless today; breaks on re-render or navigation.
**L3. [FIXED in Session 3]** Dead anchors: footer About/Contact/Careers `href="#"` (`app/page.jsx:303`), "Forgot password?" (`login/page.jsx:196`); "Pricing" nav points at the CTA (`page.jsx:75,283`) and there is no pricing section.
**L4.** Sidebar returns `null` while the session loads (`Sidebar.jsx:43`) but the layout still reserves 220px (`DashboardLayout.jsx:9`): layout shift. Pass the session from the server layout instead.
**L5.** Superadmin gets a school-scoped layout: pending count queries the `admin` school (`school/layout.jsx:16-21`), and sidebar links `/school/schools` (`Sidebar.jsx:76`) and `/register` (`:77`) have no pages.
**L6.** No `error.jsx`, `loading.jsx` or `not-found.jsx` anywhere under `app/`. Failed DB calls (`throw error` in every helper) will surface as the default Next error page.
**L7.** `npm run lint` has no ESLint config (`.eslintrc*` missing); `next lint` will prompt interactively and CI would hang.
**L8.** Unused dependencies: `jose`, `@supabase/ssr`, `@react-pdf/renderer`, `papaparse`, `lucide-react` (`package.json:16-26`), plus the anon client `supabase` and the `x-school-subdomain` header. Keep only if the next sessions use them (`jose`/PDF/CSV likely will); `@supabase/ssr` carries a `cookie` advisory.
**L9.** `getSchoolSettings` swallows every error as "missing row" and inserts (`lib/db/schools.js:138-147`), masking outages.
**L10.** `initials()` returns the first two letters of the name (`format.js:61-64`): "Principal Sahab" → "PR". Use first letters of first and last word.
**L11.** `UNIQUE(email, school_id)` allows duplicate emails when `school_id` is NULL (`schema.sql:31,40`); make `school_id` NOT NULL or add a partial unique index.
**L12.** `.env.local` carries `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_APP_NAME` which no code reads (`.env.local.example` omits them on purpose).

---

## What blocks adding new roles

1. `users.role` CHECK constraint (`supabase/schema.sql:35`): needs a migration per role, or a `roles`/`permissions` table.
2. `Sidebar.jsx:72-119`: three hardcoded role blocks; any new role renders an empty nav.
3. `school/layout.jsx:16`: `role === 'principal' || 'superadmin'` gates the approvals count.
4. No server-side permission layer (H4), so each new role would need ad hoc checks.
5. Parent/student roles need user-to-student links and a family/guardian model that the schema does not have.
6. Login demo block (`login/page.jsx:220-251`) and `seed.sql` enumerate roles by hand.

## Homepage rendering problems and causes

| Symptom | Cause |
|---|---|
| Body text not in Inter | Inter never loaded (`globals.css:1` imports DM Sans, `home.css:6` uses Inter) |
| Content invisible before/without JS | `.reveal` starts at `opacity:0` (`home.css:31`) and relies on an effect (`page.jsx:13-24`) |
| Wrong tab title/brand | Root metadata still says Edu4Everyone (`app/layout.jsx:6`) and the page is a client component, so no per-page metadata |
| "Get started"/"Register" 404 | `/register` route missing (`page.jsx:79,90,288,304`) |
| Counters/bars reset or never run on re-render | Direct DOM mutation of React nodes (`page.jsx:32-48`) |
| No CSS leak into the dashboard | Confirmed none: every rule in `home.css` is under `.nz-home` (keyframes are `nz`-prefixed) |

## Session 4 status (framework upgrade)

C1 is now fully closed: Next 16.4.0, React 19.3, next-auth 4.24.15 (v4 declares Next 16 / React 19 support and the live login passes). `npm audit` went from 14 to 9 findings (0 critical); every Next.js advisory is gone. L7 is fixed (`eslint.config.mjs`, `npm run lint`).

Remaining 9 are **known, low risk, build-time only**: Tailwind 3's dependency chain (`braces`, `micromatch`, `fast-glob`, `chokidar`, `postcss-nested`, `postcss-selector-parser`) and `eslint-config-next`'s copy of `fast-glob`. They process our own source files on developer/CI machines and never run in the deployed app or on user input. The only npm "fix" is Tailwind 4 (breaking), deferred on purpose; revisit with a design-system pass.
