# PROGRESS

## Session 1 — project rules, health check, audit (branch `session-01-audit`)

### Done so far in the product (before this session)
- Auth: NextAuth credentials (school subdomain + email + password, bcrypt), 30-day JWT carrying role and school.
- Login page with demo-credential shortcuts.
- Subdomain detection in middleware (`?school=` on localhost) and `/school/*` route protection.
- Homepage (`app/page.jsx` + namespaced `app/home.css`).
- Dashboard layout (sidebar, topbar) and a placeholder dashboard page.
- Supabase schema (13 tables, RLS enabled, no policies yet) plus demo seed.
- DB helper modules for schools, students (General Register fields), classes, subjects, teacher assignments (not yet used by any page).
- NOT found in the repo despite the brief: `/register` page with live subdomain check, waitlist form. Locate or rebuild.

### Done this session
- CLAUDE.md expanded: product goal, design rules, security rules, roles, SEO rules, roadmap, workflow.
- `.env.local.example` created (4 vars the code reads). `NEXTAUTH_URL` is not read by app code; only needed in production off Vercel.
- README setup steps corrected; `npm run check:db` added ([scripts/check-db.mjs](scripts/check-db.mjs)).
- Static schema-vs-code comparison: nothing referenced-but-missing.
- `docs/AUDIT.md` written.

### Decisions
- Tenant isolation stays app-level (service role) for now; real RLS policies need a Supabase-compatible JWT with `school_id` (see AUDIT schema notes). Decide in the roles session.
- Product name is Nizamo; remaining "Edu4Everyone" strings are tracked in AUDIT M11.

### Known issues
- **Database unreachable**: the Supabase host in `.env.local` does not resolve (internet fine). Project is probably paused/deleted or the URL is wrong. Needs the owner to restore it in the Supabase dashboard, then run `npm run check:db`.
- Audit summary: 5 critical, 10 high, 12 medium, 12 low. Critical: C1 vulnerable Next/next-auth + middleware-only gate, C2 public demo passwords (incl. superadmin), C3 `updateStudent` mass assignment, C4 unauthorized cross-tenant admin helpers and no enforced session-derived `school_id`, C5 sessions never revalidated. Details in `docs/AUDIT.md`.
- `npm run build` passes. `npm audit`: 8 vulnerabilities.

### Next session
Fix critical/high audit items + homepage errors + wire the waitlist form to a waitlist table.
(Prerequisite: restore the Supabase project and get `npm run check:db` green.)
