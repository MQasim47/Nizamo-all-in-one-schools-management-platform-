-- 005: API foundation (Session 7).
--   1. idempotency_keys: one row per (school, user, scope, key) so a retried create request
--      (payment, challan, import, message) replays the first response instead of running twice.
--   2. Audit L11: users.school_id becomes NOT NULL. UNIQUE(email, school_id) treats NULLs as
--      distinct, so school-less users could share an email. Every user, including the super
--      admin ("Nizamo Admin" school), belongs to a school; this fails (and rolls back) if not.
-- Applied by `npm run migrate` (one transaction, recorded in schema_migrations). Do not add
-- BEGIN/COMMIT here.

-- ---------------------------------------------------------------------------
-- 1. idempotency_keys
-- ---------------------------------------------------------------------------
CREATE TABLE idempotency_keys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  scope            TEXT NOT NULL CHECK (scope ~ '^[a-z0-9_.:-]{1,100}$'),
  key              TEXT NOT NULL CHECK (key ~ '^[A-Za-z0-9_-]{8,128}$'),
  request_hash     TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  state            TEXT NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress', 'completed')),
  response_status  SMALLINT CHECK (response_status BETWEEN 100 AND 599),
  response_body    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  CONSTRAINT idempotency_keys_unique UNIQUE (school_id, user_id, scope, key),
  CONSTRAINT idempotency_keys_user_fk FOREIGN KEY (school_id, user_id)
    REFERENCES users (school_id, id) ON DELETE CASCADE
);
CREATE INDEX idempotency_keys_expires_idx ON idempotency_keys (school_id, user_id, expires_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Infrastructure for every signed-in user (no app.can() permission): a user only ever sees and
-- writes their OWN keys in their OWN active school. The business permission is checked by the
-- endpoint that uses the key.
CREATE POLICY idem_select ON idempotency_keys FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND user_id = (SELECT app.user_id()));
CREATE POLICY idem_insert ON idempotency_keys FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND user_id = (SELECT app.user_id()) AND state = 'in_progress');
CREATE POLICY idem_update ON idempotency_keys FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND user_id = (SELECT app.user_id()))
  WITH CHECK (school_id = (SELECT app.school_id()) AND user_id = (SELECT app.user_id()));
CREATE POLICY idem_delete ON idempotency_keys FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND user_id = (SELECT app.user_id()));

REVOKE ALL ON idempotency_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON idempotency_keys TO authenticated;
GRANT INSERT (school_id, user_id, scope, key, request_hash) ON idempotency_keys TO authenticated;
GRANT UPDATE (state, response_status, response_body) ON idempotency_keys TO authenticated;
GRANT ALL ON idempotency_keys TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Audit L11: every user belongs to a school
-- ---------------------------------------------------------------------------
ALTER TABLE users ALTER COLUMN school_id SET NOT NULL;
