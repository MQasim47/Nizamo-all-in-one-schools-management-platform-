-- ============================================
-- Edu4Everyone — Seed Data
-- Run this AFTER schema.sql in Supabase SQL Editor
-- Creates demo accounts matching the PHP MVP demo logins
--
-- Password for ALL accounts below is: password
-- (bcrypt hash below is real and verified working)
-- ============================================

-- ============================================
-- 1. SUPER ADMIN SCHOOL + USER
-- ============================================
INSERT INTO schools (school_name, subdomain, email, plan, status)
VALUES ('Edu4Everyone Admin', 'admin', 'admin@edu4everyone.com', 'pro', 'active');

INSERT INTO users (school_id, name, email, password_hash, role, is_first_login)
VALUES (
  (SELECT id FROM schools WHERE subdomain = 'admin'),
  'Super Admin',
  'admin@edu4everyone.com',
  '$2b$10$BTSgOFdvxIbhWgSzl4yEH.927o9V2ecYm3FmeWH67VGXbHzNvDSwO',
  'superadmin',
  false
);

-- ============================================
-- 2. DEMO SCHOOL — GHS Model Town
-- ============================================
INSERT INTO schools (school_name, subdomain, email, phone, city, plan, trial_ends, status)
VALUES (
  'GHS Model Town',
  'ghs',
  'principal@ghs.com',
  '0300-1234567',
  'Lahore',
  'trial',
  CURRENT_DATE + INTERVAL '30 days',
  'active'
);

-- Principal account (login: principal@ghs.com / password)
INSERT INTO users (school_id, name, email, password_hash, role, is_first_login)
VALUES (
  (SELECT id FROM schools WHERE subdomain = 'ghs'),
  'Principal Sahab',
  'principal@ghs.com',
  '$2b$10$BTSgOFdvxIbhWgSzl4yEH.927o9V2ecYm3FmeWH67VGXbHzNvDSwO',
  'principal',
  false
);

-- Teacher account (login: ahmed@ghs.com / password)
INSERT INTO users (school_id, name, email, password_hash, role, is_first_login)
VALUES (
  (SELECT id FROM schools WHERE subdomain = 'ghs'),
  'Ahmed Khan',
  'ahmed@ghs.com',
  '$2b$10$BTSgOFdvxIbhWgSzl4yEH.927o9V2ecYm3FmeWH67VGXbHzNvDSwO',
  'teacher',
  false
);

-- School settings row
INSERT INTO school_settings (school_id, academic_year, principal_name)
VALUES (
  (SELECT id FROM schools WHERE subdomain = 'ghs'),
  '2025-2026',
  'Principal Sahab'
);

-- ============================================
-- 3. SAMPLE CLASSES
-- ============================================
INSERT INTO classes (school_id, name, section, academic_year)
VALUES
  ((SELECT id FROM schools WHERE subdomain = 'ghs'), '9th', 'A', '2025-2026'),
  ((SELECT id FROM schools WHERE subdomain = 'ghs'), '10th', 'A', '2025-2026');

-- ============================================
-- 4. SAMPLE SUBJECTS
-- ============================================
INSERT INTO subjects (school_id, name, code)
VALUES
  ((SELECT id FROM schools WHERE subdomain = 'ghs'), 'Mathematics', 'MATH'),
  ((SELECT id FROM schools WHERE subdomain = 'ghs'), 'Science', 'SCI'),
  ((SELECT id FROM schools WHERE subdomain = 'ghs'), 'English', 'ENG');

-- ============================================
-- 5. ASSIGN TEACHER (Ahmed) TO 9th A — Mathematics
-- ============================================
INSERT INTO teacher_assignments (school_id, teacher_id, class_id, subject_id)
SELECT s.id, u.id, c.id, sub.id
FROM schools s
JOIN users u    ON u.school_id = s.id AND u.email = 'ahmed@ghs.com'
JOIN classes c  ON c.school_id = s.id AND c.name = '9th' AND c.section = 'A'
JOIN subjects sub ON sub.school_id = s.id AND sub.name = 'Mathematics'
WHERE s.subdomain = 'ghs';

-- ============================================
-- 6. SAMPLE STUDENTS in 9th A
-- ============================================
INSERT INTO students (school_id, class_id, gr_number, roll_number, name, father_name, contact)
SELECT s.id, c.id, gr, roll, sname, fname, ph
FROM schools s
JOIN classes c ON c.school_id = s.id AND c.name = '9th' AND c.section = 'A'
CROSS JOIN (VALUES
  ('1001', '1', 'Ali Hassan',   'Muhammad Hassan', '0300-1111111'),
  ('1002', '2', 'Sara Ahmed',   'Ahmed Raza',      '0301-2222222'),
  ('1003', '3', 'Bilal Khan',   'Imran Khan',      '0302-3333333'),
  ('1004', '4', 'Fatima Noor',  'Noor Muhammad',   '0303-4444444'),
  ('1005', '5', 'Usman Tariq',  'Tariq Mehmood',   '0304-5555555')
) AS t(gr, roll, sname, fname, ph)
WHERE s.subdomain = 'ghs';

-- ============================================
-- VERIFY — run these to confirm seed worked:
-- SELECT school_name, subdomain FROM schools;
-- SELECT name, email, role FROM users;
-- SELECT name, roll_number FROM students;
-- ============================================
