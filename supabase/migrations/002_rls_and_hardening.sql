-- ============================================================================
-- 002_rls_and_hardening.sql  — Session 2: real tenant isolation
-- Apply AFTER schema.sql (001). Runs in one transaction: all or nothing.
--
-- How tenant isolation works now
--   * The app signs a short-lived JWT (role=authenticated, sub, school_id, app_role).
--   * Every policy compares row.school_id with app.school_id(), which only returns a
--     school when the JWT's user is ACTIVE and the school is ACTIVE in the database.
--     So suspending a school / deactivating a user cuts access at the DB, immediately.
--   * What a role may do comes from table role_permissions (role -> permission), checked by
--     app.can('x.y'). Adding accountant/receptionist/parent/student = rows, not new policies.
--   * Teachers are limited to their assigned classes (teacher_assignments);
--     parents/students to linked children (user_students).
--   * The role is read from the database (app.user_role()), not trusted from the token.
-- ============================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS app;

-- ---------------------------------------------------------------------------
-- 1. Schema changes
-- ---------------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN ('superadmin','principal','teacher','accountant','receptionist','parent','student')
);
UPDATE users SET email = lower(email) WHERE email <> lower(email);
ALTER TABLE users ADD CONSTRAINT users_email_lower CHECK (email = lower(email));
ALTER TABLE users ALTER COLUMN school_id SET NOT NULL;

-- Soft delete for General Register records (hard DELETE is revoked below)
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_by UUID;
CREATE UNIQUE INDEX IF NOT EXISTS students_gr_unique
  ON students (school_id, gr_number) WHERE gr_number IS NOT NULL;

-- Composite keys so a row can never reference another school's row
ALTER TABLE classes   ADD CONSTRAINT classes_school_id_id_key   UNIQUE (school_id, id);
ALTER TABLE subjects  ADD CONSTRAINT subjects_school_id_id_key  UNIQUE (school_id, id);
ALTER TABLE students  ADD CONSTRAINT students_school_id_id_key  UNIQUE (school_id, id);
ALTER TABLE users     ADD CONSTRAINT users_school_id_id_key     UNIQUE (school_id, id);
ALTER TABLE fee_types ADD CONSTRAINT fee_types_school_id_id_key UNIQUE (school_id, id);

ALTER TABLE students ADD CONSTRAINT students_class_same_school
  FOREIGN KEY (school_id, class_id) REFERENCES classes (school_id, id);
ALTER TABLE teacher_assignments
  ADD CONSTRAINT ta_teacher_same_school FOREIGN KEY (school_id, teacher_id) REFERENCES users (school_id, id),
  ADD CONSTRAINT ta_class_same_school   FOREIGN KEY (school_id, class_id)   REFERENCES classes (school_id, id),
  ADD CONSTRAINT ta_subject_same_school FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id);
ALTER TABLE attendance
  ADD CONSTRAINT att_student_same_school FOREIGN KEY (school_id, student_id) REFERENCES students (school_id, id),
  ADD CONSTRAINT att_class_same_school   FOREIGN KEY (school_id, class_id)   REFERENCES classes (school_id, id),
  ADD CONSTRAINT att_subject_same_school FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id);
ALTER TABLE results
  ADD CONSTRAINT res_student_same_school FOREIGN KEY (school_id, student_id) REFERENCES students (school_id, id),
  ADD CONSTRAINT res_class_same_school   FOREIGN KEY (school_id, class_id)   REFERENCES classes (school_id, id),
  ADD CONSTRAINT res_subject_same_school FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id);
ALTER TABLE homework
  ADD CONSTRAINT hw_class_same_school   FOREIGN KEY (school_id, class_id)   REFERENCES classes (school_id, id),
  ADD CONSTRAINT hw_subject_same_school FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id),
  ADD CONSTRAINT hw_teacher_same_school FOREIGN KEY (school_id, teacher_id) REFERENCES users (school_id, id);
ALTER TABLE fee_structures
  ADD CONSTRAINT fs_class_same_school   FOREIGN KEY (school_id, class_id)    REFERENCES classes (school_id, id),
  ADD CONSTRAINT fs_feetype_same_school FOREIGN KEY (school_id, fee_type_id) REFERENCES fee_types (school_id, id);
ALTER TABLE fee_payments
  ADD CONSTRAINT fp_student_same_school FOREIGN KEY (school_id, student_id)  REFERENCES students (school_id, id),
  ADD CONSTRAINT fp_feetype_same_school FOREIGN KEY (school_id, fee_type_id) REFERENCES fee_types (school_id, id);

-- ---------------------------------------------------------------------------
-- 2. New tables
-- ---------------------------------------------------------------------------
-- Which user may see which student (parents, and students themselves)
CREATE TABLE user_students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  student_id  UUID NOT NULL,
  relation    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, student_id),
  FOREIGN KEY (school_id, user_id)    REFERENCES users (school_id, id)    ON DELETE CASCADE,
  FOREIGN KEY (school_id, student_id) REFERENCES students (school_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_user_students_user ON user_students(user_id);

-- role -> permission. Read only through app.can(); not exposed to API roles.
CREATE TABLE role_permissions (
  role        TEXT NOT NULL,
  permission  TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);

CREATE TABLE school_counters (
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  value     BIGINT NOT NULL,
  PRIMARY KEY (school_id, name)
);

-- Append-only audit trail. No FK on school_id on purpose: history outlives a school row.
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  school_id   UUID,
  user_id     UUID,
  app_role    TEXT,
  table_name  TEXT NOT NULL,
  record_id   TEXT,
  action      TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_school_time ON audit_log (school_id, created_at DESC);
CREATE INDEX idx_audit_record ON audit_log (table_name, record_id);

-- Failed/successful logins for lockout. identifier = sha256(subdomain|email), never the raw email.
CREATE TABLE login_attempts (
  id          BIGSERIAL PRIMARY KEY,
  identifier  TEXT NOT NULL,
  success     BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_login_attempts ON login_attempts (identifier, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Permissions per role (add a role = add rows here)
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role, permission) VALUES
  -- principal: everything inside their own school
  ('principal','students.read_all'),('principal','students.write'),
  ('principal','attendance.read_all'),('principal','attendance.write_all'),
  ('principal','results.read_all'),('principal','results.write_all'),('principal','results.approve'),
  ('principal','classes.read'),('principal','classes.write'),
  ('principal','subjects.read'),('principal','subjects.write'),
  ('principal','users.read'),('principal','users.manage'),
  ('principal','settings.read'),('principal','settings.write'),
  ('principal','assignments.read_all'),('principal','assignments.write'),
  ('principal','homework.read_all'),
  ('principal','fees.read_all'),('principal','fees.write'),
  ('principal','links.read_all'),('principal','links.write'),
  ('principal','audit.read'),
  -- teacher: own classes/subjects only
  ('teacher','students.read_assigned'),
  ('teacher','attendance.read_assigned'),('teacher','attendance.write_assigned'),
  ('teacher','results.read_assigned'),('teacher','results.write_assigned'),
  ('teacher','classes.read'),('teacher','subjects.read'),('teacher','settings.read'),
  ('teacher','homework.read_assigned'),('teacher','homework.write_assigned'),
  -- accountant: fees, not marks
  ('accountant','students.read_all'),('accountant','fees.read_all'),('accountant','fees.write'),
  ('accountant','classes.read'),('accountant','settings.read'),
  -- receptionist: admissions / register
  ('receptionist','students.read_all'),('receptionist','students.write'),
  ('receptionist','classes.read'),('receptionist','settings.read'),
  -- parent / student: only linked children
  ('parent','students.read_linked'),('parent','attendance.read_linked'),('parent','results.read_linked'),
  ('parent','homework.read_linked'),('parent','fees.read_linked'),
  ('parent','classes.read'),('parent','settings.read'),
  ('student','students.read_linked'),('student','attendance.read_linked'),('student','results.read_linked'),
  ('student','homework.read_linked'),('student','classes.read'),('student','settings.read');
-- superadmin has no tenant permissions: it uses the server-only admin client.

-- ---------------------------------------------------------------------------
-- 4. Helper functions (SECURITY DEFINER so they can read users/schools through RLS)
-- ---------------------------------------------------------------------------
CREATE FUNCTION app.school_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.school_id FROM public.users u JOIN public.schools s ON s.id = u.school_id
  WHERE u.id = nullif(auth.jwt() ->> 'sub','')::uuid
    AND u.school_id = nullif(auth.jwt() ->> 'school_id','')::uuid
    AND u.status = 'active' AND s.status = 'active'
$$;

CREATE FUNCTION app.user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.id FROM public.users u JOIN public.schools s ON s.id = u.school_id
  WHERE u.id = nullif(auth.jwt() ->> 'sub','')::uuid
    AND u.school_id = nullif(auth.jwt() ->> 'school_id','')::uuid
    AND u.status = 'active' AND s.status = 'active'
$$;

CREATE FUNCTION app.user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.role FROM public.users u JOIN public.schools s ON s.id = u.school_id
  WHERE u.id = nullif(auth.jwt() ->> 'sub','')::uuid
    AND u.school_id = nullif(auth.jwt() ->> 'school_id','')::uuid
    AND u.status = 'active' AND s.status = 'active'
$$;

CREATE FUNCTION app.can(p text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.role_permissions rp
                 WHERE rp.role = app.user_role() AND rp.permission = p)
$$;

CREATE FUNCTION app.teaches(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_assignments ta
                 WHERE ta.teacher_id = app.user_id() AND ta.school_id = app.school_id() AND ta.class_id = c)
$$;

CREATE FUNCTION app.teaches_subject(c uuid, s uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_assignments ta
                 WHERE ta.teacher_id = app.user_id() AND ta.school_id = app.school_id()
                   AND ta.class_id = c AND ta.subject_id = s)
$$;

CREATE FUNCTION app.linked(st uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_students us
                 WHERE us.user_id = app.user_id() AND us.school_id = app.school_id() AND us.student_id = st)
$$;

CREATE FUNCTION app.linked_class(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_students us JOIN public.students st ON st.id = us.student_id
                 WHERE us.user_id = app.user_id() AND us.school_id = app.school_id() AND st.class_id = c)
$$;

-- ---------------------------------------------------------------------------
-- 5. Triggers: immutability of school_id, GR numbers, updated_at, audit
-- ---------------------------------------------------------------------------
CREATE FUNCTION app.forbid_school_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'school_id cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION app.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

-- Atomic, numeric GR numbers per school (fixes the text-sort bug and races)
CREATE FUNCTION app.assign_gr_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v bigint;
BEGIN
  IF NEW.gr_number IS NULL OR NEW.gr_number = '' THEN
    SELECT greatest(1000, coalesce(max(CASE WHEN gr_number ~ '^[0-9]{1,15}$' THEN gr_number::bigint END), 0))
      INTO v FROM public.students WHERE school_id = NEW.school_id;
    INSERT INTO public.school_counters (school_id, name, value)
      VALUES (NEW.school_id, 'gr_number', v + 1)
      ON CONFLICT (school_id, name) DO UPDATE SET value = greatest(school_counters.value, v) + 1
      RETURNING value INTO v;
    NEW.gr_number := v::text;
  END IF;
  RETURN NEW;
END $$;

-- Audit: who (JWT sub), what (table/record/action), when, old -> new (changed fields only)
CREATE FUNCTION app.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE o jsonb; n jsonb; sid uuid; rid text; od jsonb; nd jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN o := to_jsonb(OLD) - 'updated_at'; END IF;
  IF TG_OP <> 'DELETE' THEN n := to_jsonb(NEW) - 'updated_at'; END IF;
  IF TG_TABLE_NAME = 'users' THEN o := o - 'password_hash'; n := n - 'password_hash'; END IF;  -- never log secrets
  IF TG_OP = 'UPDATE' THEN
    IF o = n THEN RETURN NEW; END IF;
    SELECT jsonb_object_agg(k, v) INTO od FROM jsonb_each(o) AS e(k, v) WHERE n -> k IS DISTINCT FROM v;
    SELECT jsonb_object_agg(k, v) INTO nd FROM jsonb_each(n) AS e(k, v) WHERE o -> k IS DISTINCT FROM v;
  ELSE
    od := o; nd := n;
  END IF;
  sid := CASE WHEN TG_TABLE_NAME = 'schools' THEN (coalesce(n, o) ->> 'id')::uuid
              ELSE (coalesce(n, o) ->> 'school_id')::uuid END;
  rid := coalesce(n, o) ->> 'id';
  INSERT INTO public.audit_log (school_id, user_id, app_role, table_name, record_id, action, old_data, new_data)
  VALUES (sid, nullif(auth.jwt() ->> 'sub','')::uuid, auth.jwt() ->> 'app_role', TG_TABLE_NAME, rid, TG_OP, od, nd);
  RETURN coalesce(NEW, OLD);
END $$;

CREATE FUNCTION app.audit_log_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION app.audit_log_immutable();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','school_settings','classes','subjects','teacher_assignments','students',
      'user_students','attendance','results','homework','fee_types','fee_structures','fee_payments'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION app.forbid_school_change()',
                   t || '_school_immutable', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['schools','school_settings','students','results'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at()',
                   t || '_touch', t);
  END LOOP;
  -- audited: marks, fees, GR records, roles (users), school settings, school plan/status
  FOREACH t IN ARRAY ARRAY['schools','users','school_settings','students','results',
      'fee_types','fee_structures','fee_payments','user_students'] LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION app.audit_row()',
                   t || '_audit', t);
  END LOOP;
END $$;
CREATE TRIGGER students_gr_number BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION app.assign_gr_number();

-- Function execute rights: helpers are callable by authenticated only (policies run as the caller)
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.school_id(), app.user_id(), app.user_role(), app.can(text),
  app.teaches(uuid), app.teaches_subject(uuid, uuid), app.linked(uuid), app.linked_class(uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Table privileges (RLS filters rows; these limit what can even be attempted)
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

GRANT SELECT ON schools, school_settings, classes, subjects, teacher_assignments, students, user_students,
  attendance, results, homework, fee_types, fee_structures, fee_payments, audit_log TO authenticated;
-- users: everything except password_hash is readable
GRANT SELECT (id, school_id, name, email, role, phone, status, is_first_login, created_at) ON users TO authenticated;
GRANT INSERT (id, school_id, name, email, role, phone, status, is_first_login, password_hash),
      UPDATE (name, email, role, phone, status, is_first_login, password_hash) ON users TO authenticated;

GRANT INSERT, UPDATE ON school_settings, students, attendance, results, fee_payments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON classes, subjects, homework, fee_types, fee_structures TO authenticated;
GRANT INSERT, DELETE ON teacher_assignments, user_students TO authenticated;
-- students/results/fee_payments: no DELETE for API roles (soft delete; corrections go through the audit log).

-- audit_log: nobody (not even the service role) may change or truncate history
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security policies
-- ---------------------------------------------------------------------------
ALTER TABLE user_students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_counters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts    ENABLE ROW LEVEL SECURITY;
-- role_permissions, school_counters, login_attempts: RLS on, no policy, no grant => API roles see nothing.

-- schools: a user sees only their own school; changes go through the admin client
CREATE POLICY schools_select ON schools FOR SELECT TO authenticated
  USING (id = (SELECT app.school_id()));

-- users
CREATE POLICY users_select ON users FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id())
         AND (id = (SELECT app.user_id()) OR (SELECT app.can('users.read'))));
CREATE POLICY users_insert ON users FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('users.manage')) AND role <> 'superadmin');
CREATE POLICY users_update ON users FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('users.manage')) AND role <> 'superadmin')
  WITH CHECK (school_id = (SELECT app.school_id()) AND role <> 'superadmin');

-- school_settings
CREATE POLICY settings_select ON school_settings FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('settings.read')));
CREATE POLICY settings_insert ON school_settings FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('settings.write')));
CREATE POLICY settings_update ON school_settings FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('settings.write')))
  WITH CHECK (school_id = (SELECT app.school_id()));

-- classes / subjects
CREATE POLICY classes_select ON classes FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('classes.read')));
CREATE POLICY classes_insert ON classes FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('classes.write')));
CREATE POLICY classes_update ON classes FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('classes.write')))
  WITH CHECK (school_id = (SELECT app.school_id()));
CREATE POLICY classes_delete ON classes FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('classes.write')));

CREATE POLICY subjects_select ON subjects FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('subjects.read')));
CREATE POLICY subjects_insert ON subjects FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('subjects.write')));
CREATE POLICY subjects_update ON subjects FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('subjects.write')))
  WITH CHECK (school_id = (SELECT app.school_id()));
CREATE POLICY subjects_delete ON subjects FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('subjects.write')));

-- teacher_assignments
CREATE POLICY ta_select ON teacher_assignments FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id())
         AND ((SELECT app.can('assignments.read_all')) OR teacher_id = (SELECT app.user_id())));
CREATE POLICY ta_insert ON teacher_assignments FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('assignments.write')));
CREATE POLICY ta_delete ON teacher_assignments FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('assignments.write')));

-- user_students (parent/student links)
CREATE POLICY us_select ON user_students FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id())
         AND ((SELECT app.can('links.read_all')) OR user_id = (SELECT app.user_id())));
CREATE POLICY us_insert ON user_students FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('links.write')));
CREATE POLICY us_delete ON user_students FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('links.write')));

-- students
CREATE POLICY students_select ON students FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('students.read_all'))
     OR ((SELECT app.can('students.read_assigned')) AND app.teaches(class_id))
     OR ((SELECT app.can('students.read_linked'))   AND app.linked(id))));
CREATE POLICY students_insert ON students FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('students.write')));
CREATE POLICY students_update ON students FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('students.write')))
  WITH CHECK (school_id = (SELECT app.school_id()));

-- attendance
CREATE POLICY attendance_select ON attendance FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('attendance.read_all'))
     OR ((SELECT app.can('attendance.read_assigned')) AND app.teaches(class_id))
     OR ((SELECT app.can('attendance.read_linked'))   AND app.linked(student_id))));
CREATE POLICY attendance_insert ON attendance FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('attendance.write_all'))
     OR ((SELECT app.can('attendance.write_assigned')) AND app.teaches_subject(class_id, subject_id))));
CREATE POLICY attendance_update ON attendance FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('attendance.write_all'))
     OR ((SELECT app.can('attendance.write_assigned')) AND app.teaches_subject(class_id, subject_id))))
  WITH CHECK (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('attendance.write_all'))
     OR ((SELECT app.can('attendance.write_assigned')) AND app.teaches_subject(class_id, subject_id))));

-- results: teachers write draft/pending marks for their subjects; only approvers approve
CREATE POLICY results_select ON results FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('results.read_all'))
     OR ((SELECT app.can('results.read_assigned')) AND app.teaches_subject(class_id, subject_id))
     OR ((SELECT app.can('results.read_linked'))   AND status = 'approved' AND app.linked(student_id))));
CREATE POLICY results_insert ON results FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('results.write_all'))
     OR ((SELECT app.can('results.write_assigned')) AND app.teaches_subject(class_id, subject_id)
         AND status IN ('draft','pending') AND entered_by = (SELECT app.user_id()))));
CREATE POLICY results_update ON results FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('results.approve'))
     OR ((SELECT app.can('results.write_assigned')) AND app.teaches_subject(class_id, subject_id)
         AND status IN ('draft','pending','rejected'))))
  WITH CHECK (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('results.approve'))
     OR ((SELECT app.can('results.write_assigned')) AND app.teaches_subject(class_id, subject_id)
         AND status IN ('draft','pending') AND approved_by IS NULL)));

-- homework
CREATE POLICY homework_select ON homework FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('homework.read_all'))
     OR ((SELECT app.can('homework.read_assigned')) AND app.teaches(class_id))
     OR ((SELECT app.can('homework.read_linked'))   AND app.linked_class(class_id))));
CREATE POLICY homework_insert ON homework FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('homework.write_assigned'))
     AND teacher_id = (SELECT app.user_id()) AND app.teaches_subject(class_id, subject_id));
CREATE POLICY homework_update ON homework FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('homework.write_assigned'))
     AND teacher_id = (SELECT app.user_id()))
  WITH CHECK (school_id = (SELECT app.school_id()) AND teacher_id = (SELECT app.user_id())
     AND app.teaches_subject(class_id, subject_id));
CREATE POLICY homework_delete ON homework FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('homework.write_assigned'))
     AND teacher_id = (SELECT app.user_id()));

-- fees
CREATE POLICY fee_types_select ON fee_types FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.read_all')));
CREATE POLICY fee_types_insert ON fee_types FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')));
CREATE POLICY fee_types_update ON fee_types FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')))
  WITH CHECK (school_id = (SELECT app.school_id()));
CREATE POLICY fee_types_delete ON fee_types FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')));

CREATE POLICY fee_structures_select ON fee_structures FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.read_all')));
CREATE POLICY fee_structures_insert ON fee_structures FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')));
CREATE POLICY fee_structures_update ON fee_structures FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')))
  WITH CHECK (school_id = (SELECT app.school_id()));
CREATE POLICY fee_structures_delete ON fee_structures FOR DELETE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')));

CREATE POLICY fee_payments_select ON fee_payments FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (
        (SELECT app.can('fees.read_all'))
     OR ((SELECT app.can('fees.read_linked')) AND app.linked(student_id))));
CREATE POLICY fee_payments_insert ON fee_payments FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')));
CREATE POLICY fee_payments_update ON fee_payments FOR UPDATE TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('fees.write')))
  WITH CHECK (school_id = (SELECT app.school_id()));

-- audit_log: readable by those with audit.read, inside their school only
CREATE POLICY audit_select ON audit_log FOR SELECT TO authenticated
  USING (school_id = (SELECT app.school_id()) AND (SELECT app.can('audit.read')));

-- ---------------------------------------------------------------------------
-- 8. Atomic school registration (service role only; replaces 3 separate inserts)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.register_school(
  p_school_name text, p_subdomain text, p_email text, p_phone text, p_city text, p_address text,
  p_plan text, p_principal_name text, p_password_hash text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE sid uuid; sub text := lower(trim(p_subdomain));
BEGIN
  IF sub !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' THEN
    RAISE EXCEPTION 'invalid_subdomain' USING ERRCODE = '22023';
  END IF;
  IF sub = ANY (ARRAY['www','admin','api','app','mail','login','register','dashboard','school','schools',
                      'static','assets','cdn','support','help','docs','status','blog','billing','auth','nizamo']) THEN
    RAISE EXCEPTION 'reserved_subdomain' USING ERRCODE = '22023';
  END IF;
  INSERT INTO schools (school_name, subdomain, email, phone, city, address, plan, trial_ends, status)
  VALUES (p_school_name, sub, lower(p_email), p_phone, p_city, p_address,
          CASE WHEN p_plan IN ('trial','basic','standard','pro') THEN p_plan ELSE 'trial' END,
          (now() AT TIME ZONE 'Asia/Karachi')::date + 30, 'active')
  RETURNING id INTO sid;
  INSERT INTO users (school_id, name, email, password_hash, role, is_first_login)
  VALUES (sid, p_principal_name, lower(p_email), p_password_hash, 'principal', true);
  INSERT INTO school_settings (school_id, academic_year, principal_name)
  VALUES (sid, '2026-2027', p_principal_name);
  RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.register_school(text,text,text,text,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_school(text,text,text,text,text,text,text,text,text) TO service_role;

COMMIT;
