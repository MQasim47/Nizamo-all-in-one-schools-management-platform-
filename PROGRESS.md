# PROGRESS

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
