-- Test Data SQL Script for Octovox
-- Run this in Railway's database query console

-- Create test classes if they don't exist
INSERT INTO classes (code, name, teacher_id, created_at)
VALUES
  ('CLASS2024', 'Klas 6A - 2024', NULL, NOW()),
  ('CLASS2025', 'Klas 6B - 2024', NULL, NOW())
ON CONFLICT (code) DO NOTHING;

-- Create test students (password is 'student123' hashed)
INSERT INTO users (email, name, password, role, class_code)
VALUES
  ('anna@test.com', 'Anna Janssens', '$2a$10$X4kv7j5ZcQbLF5LlYx0Oc.GJdgyLWg6h7AUaAXhh7NVmRsDZ3F9bW', 'student', 'CLASS2024'),
  ('pieter@test.com', 'Pieter De Vries', '$2a$10$X4kv7j5ZcQbLF5LlYx0Oc.GJdgyLWg6h7AUaAXhh7NVmRsDZ3F9bW', 'student', 'CLASS2024'),
  ('emma@test.com', 'Emma Peeters', '$2a$10$X4kv7j5ZcQbLF5LlYx0Oc.GJdgyLWg6h7AUaAXhh7NVmRsDZ3F9bW', 'student', 'CLASS2025'),
  ('lucas@test.com', 'Lucas Van Damme', '$2a$10$X4kv7j5ZcQbLF5LlYx0Oc.GJdgyLWg6h7AUaAXhh7NVmRsDZ3F9bW', 'student', 'CLASS2025'),
  ('sophie@test.com', 'Sophie Willems', '$2a$10$X4kv7j5ZcQbLF5LlYx0Oc.GJdgyLWg6h7AUaAXhh7NVmRsDZ3F9bW', 'student', 'CLASS2024')
ON CONFLICT (email) DO UPDATE SET class_code = EXCLUDED.class_code;

-- Create test teacher (password is 'teacher123' hashed)
INSERT INTO users (email, name, password, role)
VALUES
  ('teacher@test.com', 'Mevr. De Boeck', '$2a$10$X4kv7j5ZcQbLF5LlYx0Oc.GJdgyLWg6h7AUaAXhh7NVmRsDZ3F9bW', 'teacher')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

-- Create some practice sessions for test students
-- First get user IDs and list IDs
WITH student_ids AS (
  SELECT id, name FROM users
  WHERE email IN ('anna@test.com', 'pieter@test.com', 'emma@test.com')
),
word_list_ids AS (
  SELECT id FROM word_lists LIMIT 2
)
INSERT INTO practice_sessions (user_id, list_id, started_at, phase, is_active, completed_at)
SELECT
  s.id,
  wl.id,
  NOW() - INTERVAL '1 day' * (ROW_NUMBER() OVER()),
  'BLIKSEM',
  false,
  NOW() - INTERVAL '1 day' * (ROW_NUMBER() OVER()) + INTERVAL '30 minutes'
FROM student_ids s
CROSS JOIN word_list_ids wl;

-- Add practice attempts with varying accuracy
WITH sessions AS (
  SELECT
    ps.id as session_id,
    ps.user_id,
    w.id as word_id,
    ps.phase
  FROM practice_sessions ps
  JOIN words w ON w.list_id = ps.list_id
  WHERE ps.user_id IN (
    SELECT id FROM users WHERE email IN ('anna@test.com', 'pieter@test.com', 'emma@test.com')
  )
  LIMIT 100
)
INSERT INTO practice_attempts (session_id, word_id, user_id, phase, response_type, is_correct, attempted_at, response_time_ms)
SELECT
  session_id,
  word_id,
  user_id,
  phase,
  'TYPED',
  CASE
    WHEN RANDOM() > 0.3 THEN true  -- 70% accuracy average
    ELSE false
  END,
  NOW() - INTERVAL '1 day' + INTERVAL '1 minute' * (ROW_NUMBER() OVER()),
  2000 + FLOOR(RANDOM() * 3000)  -- Response time between 2-5 seconds
FROM sessions;

-- Create word statistics for CLASS2024
INSERT INTO word_statistics (word_id, class_code, total_attempts, correct_attempts, accuracy_rate)
SELECT
  w.id,
  'CLASS2024',
  10 + FLOOR(RANDOM() * 40),  -- 10-50 attempts
  GREATEST(5, FLOOR(RANDOM() * 30)),  -- At least 5 correct
  50 + FLOOR(RANDOM() * 40)  -- 50-90% accuracy
FROM words w
JOIN word_lists wl ON w.list_id = wl.id
WHERE w.is_active = true
LIMIT 30
ON CONFLICT (word_id, class_code)
DO UPDATE SET
  total_attempts = EXCLUDED.total_attempts,
  correct_attempts = EXCLUDED.correct_attempts,
  accuracy_rate = EXCLUDED.accuracy_rate;

-- Create word statistics for CLASS2025
INSERT INTO word_statistics (word_id, class_code, total_attempts, correct_attempts, accuracy_rate)
SELECT
  w.id,
  'CLASS2025',
  10 + FLOOR(RANDOM() * 40),  -- 10-50 attempts
  GREATEST(3, FLOOR(RANDOM() * 25)),  -- At least 3 correct
  40 + FLOOR(RANDOM() * 50)  -- 40-90% accuracy
FROM words w
JOIN word_lists wl ON w.list_id = wl.id
WHERE w.is_active = true
LIMIT 30
ON CONFLICT (word_id, class_code)
DO UPDATE SET
  total_attempts = EXCLUDED.total_attempts,
  correct_attempts = EXCLUDED.correct_attempts,
  accuracy_rate = EXCLUDED.accuracy_rate;

-- Create class_word_lists table if it doesn't exist (from migration)
CREATE TABLE IF NOT EXISTS class_word_lists (
  id SERIAL PRIMARY KEY,
  class_code VARCHAR(50) NOT NULL,
  list_id INTEGER NOT NULL REFERENCES word_lists(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(class_code, list_id)
);

-- Assign all existing word lists to test classes
INSERT INTO class_word_lists (class_code, list_id, is_active)
SELECT
  c.code,
  wl.id,
  true
FROM classes c
CROSS JOIN word_lists wl
ON CONFLICT (class_code, list_id) DO UPDATE SET is_active = true;

-- Create global statistics (NULL class_code means global)
INSERT INTO word_statistics (word_id, class_code, total_attempts, correct_attempts, accuracy_rate)
SELECT
  word_id,
  NULL as class_code,
  SUM(total_attempts),
  SUM(correct_attempts),
  (SUM(correct_attempts)::DECIMAL / SUM(total_attempts)::DECIMAL * 100)
FROM word_statistics
WHERE class_code IS NOT NULL
GROUP BY word_id
ON CONFLICT (word_id, class_code)
DO UPDATE SET
  total_attempts = EXCLUDED.total_attempts,
  correct_attempts = EXCLUDED.correct_attempts,
  accuracy_rate = EXCLUDED.accuracy_rate;

-- Verify the test data
SELECT
  'Test Users Created' as info,
  COUNT(*) as count
FROM users
WHERE email LIKE '%@test.com'
UNION ALL
SELECT
  'Practice Sessions Created',
  COUNT(*)
FROM practice_sessions
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
UNION ALL
SELECT
  'Practice Attempts Created',
  COUNT(*)
FROM practice_attempts
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')
UNION ALL
SELECT
  'Word Statistics Created',
  COUNT(*)
FROM word_statistics;