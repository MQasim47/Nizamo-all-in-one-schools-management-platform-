-- ============================================================================
-- 003_waitlist.sql — Session 3: Founding Schools waitlist
-- Apply AFTER 002_rls_and_hardening.sql. One transaction.
-- No API role can touch this table: only the server's admin client (POST /api/waitlist,
-- /admin/waitlist) reads or writes it.
-- ============================================================================
BEGIN;

CREATE TABLE waitlist (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name         TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  city                TEXT NOT NULL,
  student_count_range TEXT NOT NULL
                      CHECK (student_count_range IN ('under_100','100_300','300_600','600_1000','over_1000')),
  whatsapp            TEXT NOT NULL,            -- normalised E.164, e.g. +923001234567
  email               TEXT,                     -- optional, stored lowercase
  source              TEXT,                     -- utm_source / utm_medium / utm_campaign
  status              TEXT NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','contacted','demo','converted')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT waitlist_whatsapp_format CHECK (whatsapp ~ '^\+923[0-9]{9}$')
);

-- One entry per WhatsApp number
CREATE UNIQUE INDEX waitlist_whatsapp_key ON waitlist (whatsapp);
CREATE INDEX waitlist_status_created ON waitlist (status, created_at DESC);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
-- No policies on purpose, and no grants to API roles => anon/authenticated see and change nothing.
REVOKE ALL ON waitlist FROM PUBLIC, anon, authenticated;

COMMIT;
