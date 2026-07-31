-- ============================================
-- Edu4Everyone — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor FIRST
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCHOOLS TABLE
-- ============================================
CREATE TABLE schools (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name   TEXT NOT NULL,
  subdomain     TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  phone         TEXT,
  city          TEXT,
  address       TEXT,
  plan          TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','basic','standard','pro')),
  trial_ends    DATE,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('superadmin','principal','teacher')),
  phone           TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  is_first_login  BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, school_id)
);

-- ============================================
-- SCHOOL SETTINGS
-- ============================================
CREATE TABLE school_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id            UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  academic_year        TEXT DEFAULT '2025-2026',
  principal_name       TEXT,
  school_address       TEXT,
  school_phone         TEXT,
  school_email         TEXT,
  logo_url             TEXT,
  marksheet_footer     TEXT,
  passing_percentage   NUMERIC(5,2) DEFAULT 40.00,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE classes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  section        TEXT NOT NULL,
  academic_year  TEXT DEFAULT '2025-2026',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name, section, academic_year)
);

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  code       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- ============================================
-- TEACHER ASSIGNMENTS
-- ============================================
CREATE TABLE teacher_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, teacher_id, class_id, subject_id)
);

-- ============================================
-- STUDENTS TABLE (with complete General Register data)
-- ============================================
CREATE TABLE students (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id              UUID NOT NULL REFERENCES classes(id),

  -- Basic Info
  gr_number             TEXT,
  roll_number           TEXT NOT NULL,
  name                  TEXT NOT NULL,
  father_name           TEXT,
  mother_name           TEXT,
  guardian_name         TEXT,
  guardian_relationship TEXT,

  -- Personal Details (General Register)
  date_of_birth         DATE,
  place_of_birth        TEXT,
  gender                TEXT CHECK (gender IN ('male','female','other')),
  religion              TEXT DEFAULT 'Islam',
  caste                 TEXT,
  nationality           TEXT DEFAULT 'Pakistani',
  b_form_number         TEXT,
  father_cnic           TEXT,
  mother_cnic           TEXT,

  -- Contact
  contact               TEXT,
  home_address          TEXT,
  emergency_contact     TEXT,

  -- Previous School (General Register)
  last_school_name      TEXT,
  last_school_tc_number TEXT,
  last_school_leaving_date DATE,
  last_class_attended   TEXT,

  -- Admission
  date_of_admission     DATE DEFAULT CURRENT_DATE,
  admitted_in_class     TEXT,

  -- Leaving (for SLC / TC generation)
  date_of_leaving       DATE,
  leaving_reason        TEXT CHECK (leaving_reason IN ('tc','result','removal','other') OR leaving_reason IS NULL),
  leaving_class         TEXT,
  promoted_to_class     TEXT,

  status                TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','left')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id),
  subject_id  UUID NOT NULL REFERENCES subjects(id),
  date        DATE NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('present','absent','late','holiday')),
  marked_by   UUID REFERENCES users(id),
  remarks     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, date)
);

-- ============================================
-- RESULTS TABLE
-- ============================================
CREATE TABLE results (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id         UUID NOT NULL REFERENCES classes(id),
  subject_id       UUID NOT NULL REFERENCES subjects(id),
  exam_type        TEXT NOT NULL CHECK (exam_type IN ('unit_test','midterm','quarterly','half_yearly','final')),
  marks_obtained   NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_marks        NUMERIC(6,2) NOT NULL DEFAULT 100,
  grade            TEXT,
  percentage       NUMERIC(5,2),
  academic_year    TEXT DEFAULT '2025-2026',
  status           TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  entered_by       UUID REFERENCES users(id),
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  reject_reason    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, exam_type, academic_year)
);

-- ============================================
-- HOMEWORK TABLE
-- ============================================
CREATE TABLE homework (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id     UUID NOT NULL REFERENCES classes(id),
  subject_id   UUID NOT NULL REFERENCES subjects(id),
  teacher_id   UUID NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  description  TEXT,
  attachment_url TEXT,
  due_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FEE TYPES TABLE
-- ============================================
CREATE TABLE fee_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- ============================================
-- FEE STRUCTURES
-- ============================================
CREATE TABLE fee_structures (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id      UUID REFERENCES classes(id),
  fee_type_id   UUID NOT NULL REFERENCES fee_types(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL,
  effective_from DATE DEFAULT CURRENT_DATE,
  academic_year TEXT DEFAULT '2025-2026',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FEE PAYMENTS
-- ============================================
CREATE TABLE fee_payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_type_id      UUID NOT NULL REFERENCES fee_types(id),
  amount_paid      NUMERIC(10,2) NOT NULL,
  month_year       TEXT,
  payment_date     DATE DEFAULT CURRENT_DATE,
  receipt_number   TEXT,
  payment_method   TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','online')),
  remarks          TEXT,
  collected_by     UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- Schools cannot see each other's data even if app has bugs
-- ============================================
ALTER TABLE schools             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE results             ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments        ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_school         ON users(school_id);
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_classes_school       ON classes(school_id);
CREATE INDEX idx_subjects_school      ON subjects(school_id);
CREATE INDEX idx_students_school      ON students(school_id);
CREATE INDEX idx_students_class       ON students(class_id);
CREATE INDEX idx_attendance_school    ON attendance(school_id);
CREATE INDEX idx_attendance_date      ON attendance(date);
CREATE INDEX idx_attendance_student   ON attendance(student_id);
CREATE INDEX idx_results_school       ON results(school_id);
CREATE INDEX idx_results_student      ON results(student_id);
CREATE INDEX idx_results_status       ON results(status);
CREATE INDEX idx_homework_school      ON homework(school_id);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_school  ON fee_payments(school_id);
