# CI and where each test runs

Workflow: [.github/workflows/ci.yml](../.github/workflows/ci.yml). It runs on every push and pull request to `main` (and by hand from the Actions tab). Free GitHub-hosted runners, no paid services.

## What CI runs

| Job | Steps |
|---|---|
| **checks** | `npm ci` → `npm run lint` → `npm run test:unit` → `npm run test:pdf` → `npm run build` |
| **database** | starts a **throwaway local Supabase** in the runner (Supabase CLI + Docker, config in [ci/supabase/config.toml](../ci/supabase/config.toml)) → `npm run migrate` (all of `supabase/migrations` on an empty database) → `npm run migrate` again (must say "Nothing to apply") → `npm run db:status` → `npm run test:tenant` (real Supabase roles, PostgREST and RLS) → `npm run test:migrate` |

### Safety
- The workflow uses **no repository secrets**. It cannot reach the dev database or any hosted project.
- The local stack's keys are Supabase's public, well-known local demo keys. They are masked in the log anyway.
- `npm run migrate` refuses to run when `CI` is set and `DATABASE_URL` is not `localhost`/`127.0.0.1`. `test:migrate` refuses non-local hosts too.
- The build uses placeholder environment values. Nothing in the build talks to a database.

## Tests that stay LOCAL (need the dev database and/or a running server)

| Command | Needs |
|---|---|
| `npm run check:db` | dev Supabase keys in `.env.local` |
| `npm run test:api` | dev server on 3101 + dev DB (seeds and removes a throwaway school) |
| `npm run test:waitlist` | dev server on 3101 + dev DB |
| `npm run test:app` | dev server on 3101 + dev DB + demo passwords |
| `npm run test:nav` | dev server on 3101 + Chrome/Edge |
| `npm run test:tenant` (against dev) | dev DB (CI runs the same test against its throwaway stack) |

Run them before merging: start `npm run dev -- -p 3101` in one terminal, then run each command.

## Reproduce the CI database job on your machine (Docker Desktop running)

```bash
npx supabase@3.2.0 start --workdir ci          # first run downloads images (a few minutes)
npx supabase@3.2.0 status --workdir ci -o env  # prints API_URL, ANON_KEY, SERVICE_ROLE_KEY, JWT_SECRET, DB_URL
# export those as NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# SUPABASE_JWT_SECRET, DATABASE_URL and TEST_DATABASE_URL (environment variables win over .env.local), then:
npm run migrate && npm run test:tenant && npm run test:migrate
npx supabase@3.2.0 stop --workdir ci --no-backup
```

You can also run the app against it (`supabase/seed.sql` loaded, demo password `password`) to try the live tests without touching dev.

## When CI is red
Open the run in the Actions tab, expand the failed step, and fix it on the session branch. Nothing merges to `main` with a red pipeline, and never use `--no-verify`.
