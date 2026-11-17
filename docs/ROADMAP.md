# Nizamo roadmap (from 17 Nov 2026)

Remaining work as numbered sessions, one session each, in dependency order. Web first until it is fully functional, then launch hardening and deployment, then mobile. Sessions 1-5 are done (see PROGRESS.md); numbering continues from 6.

Every session also meets the **Definition of Done** proposed in `docs/STATUS-2026-11.md` §6 (once adopted into CLAUDE.md): service + `/api/v1` route, RLS + tenant test, audit trigger where needed, loading/empty/error states, English/Urdu labels where they matter, lint + tests + build + CI green, PROGRESS.md updated. Below, "Tests" lists only what is specific to that session.

Sizing rule: if a session's scope does not fit, split it; never leave a half-built module on main.

---

## Phase A — make the base safe (do these first)

### Session 6 — Close Session 5 and patch security
- **Scope:** run `migration 004` on dev; founder browser check of the new UI; merge `session-05-app-ui` into main (keep the status branch's PROGRESS.md on conflict). Upgrade `next` + `eslint-config-next` to 16.4.6 and `zod` to ≥4.6.6; remove or narrow `images.remotePatterns` in `next.config.js`; fix the 5 `set-state-in-effect` warnings. Sync `schema.sql` role CHECK with migration 002 (or add a comment pointing to it). Make the test scripts' port configurable via one env var and document it.
- **Tests:** all existing scripts; `npm audit` shows no critical/high; first `npm run build` on a clean `.next` passes without the security stop.
- **Done when:** main contains Session 5, `check:db` green, audit has 0 critical/high, build passes first time.

### Session 7 — Reliability foundation
- **Scope:** GitHub Actions CI (install, lint, unit, pdf, build; tenant/API tests against a dedicated **test** Supabase project via repo secrets). `schema_migrations` table + `npm run db:status` (and `check:db` fails when behind). Error monitoring (Sentry or similar, PII scrubbing on). API conventions: `lib/api/handler.js` (auth → zod → service → error envelope), typed errors, cursor pagination helper, `/api/v1` prefix. Test harness: scripts start their own `next start` on a free port; a seeded test school fixture shared by all API tests. Fix audit L9, L11.
- **Tests:** CI run is green on push; a deliberately failing test turns CI red; handler unit tests (error envelope, 401/403/422 mapping); `db:status` detects a missing migration.
- **Done when:** every push runs CI; a thrown server error appears in monitoring without personal data; the API pattern is documented in CLAUDE.md.

### Session 8 — Auth and identity decisions built in
- **Scope:** `requireApiSession` accepts cookie **or** bearer token (token issuing comes in M1; build the verification path and `device_sessions` table now). Forced password change on first login and principal-initiated password reset (audit M3). Per-IP login limit + shared rate-limit store (Upstash). `users.phone` (normalised, unique per school) and nullable email for parent/student roles (no OTP yet).
- **Tests:** first-login user is forced to change password and cannot reach other pages; reset invalidates old sessions; bearer path accepts a valid test token and rejects expired/forged/revoked ones; IP limit returns 429; tenant test extended.
- **Done when:** a mobile client could authenticate against the same API (with a test-issued token) and gets the same RLS-scoped data.

---

## Phase B — school setup

### Session 9 — Staff and roles (roadmap module 1)
- **Scope:** Staff page: add/edit/deactivate staff (principal, teacher, accountant, receptionist), assign role, reset password, show last login. Role/permission overview (read-only matrix). Menus for the new roles.
- **Tests:** each role sees exactly its menu and gets 403 elsewhere (`test:app` extended); principal cannot deactivate themself; role change is audited; deactivated user is signed out within 60 s.
- **Done when:** a principal can create an accountant who signs in and sees only finance items.

### Session 10 — Academic sessions, classes, sections, subjects
- **Scope:** `academic_sessions` table (one current per school), replace every `'2025-2026'` default (audit M9); classes + sections; subjects; teacher assignments UI (uses the existing atomic helper).
- **Tests:** only one current session per school (DB constraint); switching session changes lists; teacher sees only assigned classes; deleting a class with students is blocked; tenant test for new tables.
- **Done when:** a school can set up its year, classes and subjects without SQL.

### Session 11 — School profile and setup wizard
- **Scope:** school settings (name in English/Urdu, address, phone, logo upload to a **private** bucket with signed URLs, principal name/signature for printouts); first-login setup wizard (school info → session → classes → subjects → staff → students), resumable.
- **Tests:** logo URL is signed and expires; another school cannot fetch the logo; wizard resumes at the right step; settings changes audited.
- **Done when:** a brand-new school goes from registration to a configured school in one sitting.

---

## Phase C — students

### Session 12 — General Register and family model (module 2a)
- **Scope:** student admission form (General Register fields incl. B-Form), detail page, edit with audit, soft delete/restore, masked lists, search/filter, `families` + `guardians` + `student_guardians` (designed for fees and the parent app), sibling detection by guardian CNIC/phone, photo/documents in private storage.
- **Tests:** GR numbers unique and gap-free under 20 concurrent admissions; masked fields in list, full on detail only for permitted roles; teacher sees only own classes; audit row with old→new for an edit; tenant tests.
- **Done when:** a receptionist can admit a student with guardians and print nothing yet; the register is searchable.

### Session 13 — Bulk import (module 3 import)
- **Scope:** Excel/CSV import for students (and staff): template download, column mapping, dry-run preview with per-row errors, commit in one transaction, idempotent re-upload.
- **Tests:** 1,000-row file imports; a bad row blocks nothing else in dry run and is reported with its row number; re-uploading the same file creates no duplicates; formula injection neutralised on export.
- **Done when:** a school can load its whole register from its existing spreadsheet.

### Session 14 — SLC and certificates (module 2b)
- **Scope:** School Leaving Certificate (one click from the student, Urdu + English, numbered, reprint marked as duplicate), character and bonafide certificates, leaving-student flow.
- **Tests:** PDF snapshot of fields; certificate numbers unique per school; issuing is audited; a left student no longer appears in active lists.
- **Done when:** an SLC prints correctly on A4 with Urdu text.

---

## Phase D — daily operations

### Session 15 — Attendance (module 4a)
- **Scope:** daily class attendance (teacher for assigned classes, principal for all), edit window, holidays, monthly register view and percentages; add audit trigger to `attendance`.
- **Tests:** percentage calculation unit tests (holidays, late joiners); teacher cannot mark another class (API + RLS); Pakistan date at 00:30 PKT is today, not yesterday; edits audited.
- **Done when:** a teacher marks a class on a phone in under a minute.

### Session 16 — Notification outbox + WhatsApp absent alert (module 4b)
- **Scope:** `notifications` + `notification_outbox`, worker (Vercel Cron or Edge Function) with retries, WhatsApp provider adapter (templates, opt-in, delivery status webhook), absent alert to guardians, per-school on/off and quiet hours.
- **Tests:** marking absent writes exactly one outbox row per guardian (idempotent on re-save); worker retries then marks failed; webhook updates status; provider mocked in CI.
- **Done when:** a real test phone receives the absent message once.

---

## Phase E — exams

### Session 17 — Exams, marks entry, approvals (module 5)
- **Scope:** exam setup (terms, max marks, subjects), marks entry grid for teachers, submit → principal approve/return, locked after approval, approvals count via SQL (audit M7).
- **Tests:** grade function matches PHP MVP thresholds (table-driven); marks > max rejected; approved marks cannot be edited by a teacher (RLS); every change audited; approvals count is a single query.
- **Done when:** a full term's marks for one class can be entered and approved.

### Session 18 — Marksheet PDF and class gazette (module 6)
- **Scope:** per-student marksheet (Urdu + English, school logo, positions), class gazette result sheet, bulk print for a class.
- **Tests:** totals, percentages and positions (ties) unit-tested; PDF renders for a 60-student class within time limit; only approved results print.
- **Done when:** a class's marksheets and gazette print correctly.

---

## Phase F — fees (split in three)

### Session 19 — Fee setup and family accounts (module 7a)
- **Scope:** fee heads, class fee structures per session, family accounts linked to guardians, sibling and other discounts, scholarship, fine rules. Money as integer rupees.
- **Tests:** discount/fine calculation table tests (percent vs fixed, caps, siblings); structure change does not alter issued challans.
- **Done when:** an accountant can define a school's full fee plan.

### Session 20 — Challans, payments, receipts (module 7b)
- **Scope:** monthly challan generation (3-part PDF: bank/school/student, family challan), payment recording (cash, bank, JazzCash/Easypaisa/Raast reference), partial payments, receipts, cancel with reason (no delete).
- **Tests:** generation is idempotent per month; double-submitted payment creates one row (idempotency key); balance = issued − paid − discounts + fines, verified in SQL and JS; all fee writes audited.
- **Done when:** a month's challans print and payments reconcile to the rupee.

### Session 21 — Defaulters and fee reminders (module 7c)
- **Scope:** defaulter list with ageing, family ledger, fee reminders through the outbox (WhatsApp), daily collection report, export.
- **Tests:** ageing buckets correct across month ends; reminders not sent twice; accountant sees fees but not marks.
- **Done when:** the principal can see who owes what and send reminders in two clicks.

---

## Phase G — parents and the principal

### Session 22 — Parent portal (PWA) (module 8)
- **Scope:** parent sign-in (phone + password now; OTP in M1), children switcher, attendance, results, fee balance and challan download, notices; installable PWA; all through `/api/v1`.
- **Tests:** parent sees only linked children (RLS + API); E2E on 360px; unpublished results hidden.
- **Done when:** a parent with two children can check both on a phone.

### Session 23 — Principal dashboard (module 9)
- **Scope:** real figures: attendance today, fee collection vs target, pending approvals, defaulters, admissions; drill-down links.
- **Tests:** every number equals a direct SQL count in tests; loads in one round of queries.
- **Done when:** the principal's daily questions are answered on one screen.

### Session 24 — ID cards (module 10)
- **Scope:** student and staff ID cards PDF (photo, GR, QR with a signed lookup), bulk print per class.
- **Tests:** QR does not expose personal data; missing photos handled.
- **Done when:** a class's ID cards print on card sheets.

### Session 25 — Homework/diary and notices
- **Scope:** teacher diary/homework per class, school notices to roles/classes, delivery through the outbox; audit trigger on homework.
- **Tests:** teacher posts only to assigned classes; notice targeting correct; parent sees only relevant items.
- **Done when:** the daily diary reaches parents.

### Session 26 — Superadmin panel and data rights
- **Scope:** schools list (status, plan, students count, last activity), activate/suspend/change plan with confirmation, per-school data export (Excel/CSV), deletion request flow.
- **Tests:** only superadmin can call these (403 otherwise); suspension cuts access within 60 s; export contains only that school's data.
- **Done when:** the founder can run the platform without SQL.

---

## Phase H — launch

### Session 27 — Launch hardening
- **Scope:** enforce CSP with nonces; full E2E suite per role; legal pages finalised (operator name/address, lawyer review, remove draft banner); privacy checks (no PII in logs/URLs); load test with 50 schools of seeded data; performance pass.
- **Tests:** CSP enforced with no violations in E2E; load test p95 targets met.
- **Done when:** a written launch checklist is all green.

### Session 28 — Deployment
- **Scope:** production Supabase (paid tier: no pausing, PITR), run schema + migrations in order (never `seed.sql`), superadmin created out of band; Vercel project; `getnizamo.com` + `www` redirect + wildcard `*.getnizamo.com` DNS and TLS; env vars; monitoring and uptime alerts; backup restore drill; Search Console + sitemap.
- **Tests:** smoke test on production (login per role, tenant mismatch redirect, unknown subdomain 404); restore drill into a scratch project succeeds; `curl -I` shows security headers and noindex on school hosts.
- **Done when:** the first real school can sign in on its own subdomain.

(Tier 2: timetable, staff attendance, leave, payroll, school accounts, online fee payment, bulk promotion, admissions CRM, public school page — scheduled after launch, before or alongside mobile, by demand.)

---

## Phase M — mobile (after the web is live)

### Session M1 — Mobile auth
- **Scope:** token endpoints (`/api/v1/auth/token`, refresh, revoke), `device_sessions` UI for schools ("sign out this phone"), parent OTP via WhatsApp/SMS.
- **Tests:** refresh rotation (reuse of an old refresh token revokes the chain); revoked device loses access immediately; OTP rate-limited.
- **Done when:** a test client can sign in and call every parent/teacher endpoint.

### Session M2 — Push notifications
- **Scope:** `device_tokens`, FCM/Expo provider in the existing outbox worker, channel preferences (WhatsApp / push).
- **Tests:** one event → one push per device; invalid tokens pruned.
- **Done when:** absent alert arrives as push on a test device.

### Session M3 — Parent app
- **Scope:** React Native (Expo) app: children, attendance, results, fees, notices, push.
- **Tests:** E2E on Android emulator; offline read of last data.
- **Done when:** internal test build installed by a pilot parent.

### Session M4 — Teacher app
- **Scope:** attendance marking (offline queue, sync with conflict rules), diary, marks view.
- **Tests:** offline marks sync exactly once; conflicting edits resolved by the documented rule.
- **Done when:** a teacher can mark attendance with no signal and it syncs later.

### Session M5 — Store release
- **Scope:** Play Store (first) and App Store listings, privacy labels, crash reporting.
- **Done when:** the app is public in the Play Store.
