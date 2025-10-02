-- Octovox Database Schema Fix Migration
-- This migration fixes all schema conflicts and adds missing tables
-- Run this migration to fix UUID vs INTEGER conflicts and add missing functionality

-- =====================================================
-- PART 1: FIX DATA TYPE CONFLICTS
-- =====================================================

-- Drop conflicting tables if they exist (we'll recreate them with correct types)
DROP TABLE IF EXISTS word_statistics CASCADE;
DROP TABLE IF EXISTS class_word_lists CASCADE;

-- Add missing columns to existing tables
ALTER TABLE word_lists ADD COLUMN IF NOT EXISTS theme VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_code VARCHAR(50);

-- Create index on users.class_code for performance
CREATE INDEX IF NOT EXISTS idx_users_class_code ON users(class_code);

-- Update users role check to include 'administrator'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher', 'administrator'));

-- =====================================================
-- PART 2: RECREATE CONFLICTING TABLES WITH CORRECT TYPES
-- =====================================================

-- Recreate word_statistics with UUID type (matching words.id)
CREATE TABLE IF NOT EXISTS word_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  class_code VARCHAR(50),
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0,
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(word_id, class_code)
);

CREATE INDEX IF NOT EXISTS idx_word_statistics_accuracy ON word_statistics(accuracy_rate);
CREATE INDEX IF NOT EXISTS idx_word_statistics_class ON word_statistics(class_code);
CREATE INDEX IF NOT EXISTS idx_word_statistics_word ON word_statistics(word_id);

-- Recreate class_word_lists with UUID type (matching word_lists.id)
CREATE TABLE IF NOT EXISTS class_word_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_code VARCHAR(50) NOT NULL,
  list_id UUID NOT NULL REFERENCES word_lists(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(class_code, list_id)
);

CREATE INDEX IF NOT EXISTS idx_class_word_lists_class ON class_word_lists(class_code);
CREATE INDEX IF NOT EXISTS idx_class_word_lists_list ON class_word_lists(list_id);
CREATE INDEX IF NOT EXISTS idx_class_word_lists_assigned_by ON class_word_lists(assigned_by);

COMMENT ON TABLE class_word_lists IS 'Links word lists to specific classes, allowing teachers to control which lists their students can access';

-- =====================================================
-- PART 3: ADD MISSING TABLES FOR 3-PHASE LEARNING SYSTEM
-- =====================================================

-- Practice attempts table (for tracking individual word attempts)
CREATE TABLE IF NOT EXISTS practice_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  session_id UUID,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user ON practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_word ON practice_attempts(word_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_session ON practice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_created_at ON practice_attempts(created_at);

-- Practice sessions table (enhanced version with 3-phase system support)
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES word_lists(id) ON DELETE SET NULL,
  current_phase INTEGER DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 3),
  current_battery_number INTEGER DEFAULT 1,
  session_state JSONB DEFAULT '{}',
  words_in_session UUID[] DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  perfect_score_achieved BOOLEAN DEFAULT false,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_list ON practice_sessions(list_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_completed ON practice_sessions(completed);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_started_at ON practice_sessions(started_at);

-- Word phase status (for 3-phase learning system)
CREATE TABLE IF NOT EXISTS word_phase_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL DEFAULT 1 CHECK (phase BETWEEN 1 AND 3),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passed', 'failed')),
  attempts_in_phase INTEGER DEFAULT 0,
  correct_in_phase INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  passed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, word_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_word_phase_status_user ON word_phase_status(user_id);
CREATE INDEX IF NOT EXISTS idx_word_phase_status_word ON word_phase_status(word_id);
CREATE INDEX IF NOT EXISTS idx_word_phase_status_phase ON word_phase_status(phase);
CREATE INDEX IF NOT EXISTS idx_word_phase_status_status ON word_phase_status(status);
CREATE INDEX IF NOT EXISTS idx_word_phase_status_composite ON word_phase_status(user_id, phase, status);

-- Battery progress (for tracking progress within each battery)
CREATE TABLE IF NOT EXISTS battery_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES word_lists(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 3),
  battery_number INTEGER NOT NULL,
  words_in_battery UUID[] DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  all_correct BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, list_id, phase, battery_number)
);

CREATE INDEX IF NOT EXISTS idx_battery_progress_user ON battery_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_battery_progress_list ON battery_progress(list_id);
CREATE INDEX IF NOT EXISTS idx_battery_progress_phase ON battery_progress(phase);

-- Word attempts (detailed tracking for 3-phase system)
CREATE TABLE IF NOT EXISTS word_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 3),
  battery_number INTEGER,
  is_correct BOOLEAN NOT NULL,
  typed_answer TEXT,
  autocorrect_applied BOOLEAN DEFAULT false,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_word_attempts_user ON word_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_word_attempts_word ON word_attempts(word_id);
CREATE INDEX IF NOT EXISTS idx_word_attempts_session ON word_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_word_attempts_session_word ON word_attempts(session_id, word_id);
CREATE INDEX IF NOT EXISTS idx_word_attempts_created_at ON word_attempts(created_at);

-- Upload sessions (for tracking Excel file uploads)
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  total_words INTEGER DEFAULT 0,
  processed_words INTEGER DEFAULT 0,
  created_list_id UUID REFERENCES word_lists(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_created_at ON upload_sessions(created_at);

-- Reward settings (for perfect score rewards)
CREATE TABLE IF NOT EXISTS reward_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default reward settings
INSERT INTO reward_settings (setting_key, setting_value, description) VALUES
  ('perfect_score_enabled', 'true', 'Enable perfect score rewards'),
  ('perfect_score_video_url', '', 'YouTube video URL for perfect score reward'),
  ('perfect_score_message', 'Gefeliciteerd! Je hebt alle woorden perfect!', 'Message shown on perfect score')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- PART 4: UPDATE LEARNING_SESSIONS TABLE
-- =====================================================

-- Add columns to learning_sessions if they don't exist
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS current_phase INTEGER DEFAULT 1;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS current_battery_number INTEGER DEFAULT 1;
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS session_state JSONB DEFAULT '{}';
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS perfect_score_achieved BOOLEAN DEFAULT false;

-- =====================================================
-- PART 5: CREATE UPDATED TRIGGER FUNCTIONS
-- =====================================================

-- Trigger for practice_sessions updated_at
CREATE TRIGGER update_practice_sessions_updated_at
BEFORE UPDATE ON practice_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for word_phase_status updated_at
CREATE TRIGGER update_word_phase_status_updated_at
BEFORE UPDATE ON word_phase_status
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for battery_progress updated_at
CREATE TRIGGER update_battery_progress_updated_at
BEFORE UPDATE ON battery_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reward_settings updated_at
CREATE TRIGGER update_reward_settings_updated_at
BEFORE UPDATE ON reward_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for word_statistics updated_at
CREATE TRIGGER update_word_statistics_updated_at
BEFORE UPDATE ON word_statistics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 6: UPDATE WORD STATISTICS FUNCTION
-- =====================================================

-- Recreate function with correct UUID types
CREATE OR REPLACE FUNCTION update_word_statistics()
RETURNS void AS $$
BEGIN
  -- Update statistics per class
  INSERT INTO word_statistics (word_id, class_code, total_attempts, correct_attempts, accuracy_rate)
  SELECT
    pa.word_id,
    u.class_code,
    COUNT(*)::INTEGER as total_attempts,
    SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END)::INTEGER as correct_attempts,
    (SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0) * 100) as accuracy_rate
  FROM practice_attempts pa
  JOIN users u ON pa.user_id = u.id
  WHERE u.class_code IS NOT NULL
  GROUP BY pa.word_id, u.class_code
  ON CONFLICT (word_id, class_code)
  DO UPDATE SET
    total_attempts = EXCLUDED.total_attempts,
    correct_attempts = EXCLUDED.correct_attempts,
    accuracy_rate = EXCLUDED.accuracy_rate,
    last_calculated = CURRENT_TIMESTAMP;

  -- Update overall statistics (class_code = NULL for global stats)
  INSERT INTO word_statistics (word_id, class_code, total_attempts, correct_attempts, accuracy_rate)
  SELECT
    word_id,
    NULL as class_code,
    SUM(total_attempts)::INTEGER,
    SUM(correct_attempts)::INTEGER,
    (SUM(correct_attempts)::DECIMAL / NULLIF(SUM(total_attempts)::DECIMAL, 0) * 100) as accuracy_rate
  FROM word_statistics
  WHERE class_code IS NOT NULL
  GROUP BY word_id
  ON CONFLICT (word_id, class_code)
  DO UPDATE SET
    total_attempts = EXCLUDED.total_attempts,
    correct_attempts = EXCLUDED.correct_attempts,
    accuracy_rate = EXCLUDED.accuracy_rate,
    last_calculated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 7: ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON TABLE practice_attempts IS 'Tracks every individual attempt at a word during practice';
COMMENT ON TABLE practice_sessions IS 'Tracks complete practice sessions with 3-phase system support';
COMMENT ON TABLE word_phase_status IS 'Tracks which phase each word is in for each user';
COMMENT ON TABLE battery_progress IS 'Tracks progress through batteries within each phase';
COMMENT ON TABLE word_attempts IS 'Detailed attempt tracking for the 3-phase learning system';
COMMENT ON TABLE upload_sessions IS 'Tracks Excel file upload sessions for bulk word list creation';
COMMENT ON TABLE reward_settings IS 'Global settings for reward system (perfect scores, etc)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Schema fix migration completed successfully!';
  RAISE NOTICE 'Fixed: UUID vs INTEGER conflicts';
  RAISE NOTICE 'Added: Missing tables (practice_attempts, practice_sessions, upload_sessions, reward_settings, etc)';
  RAISE NOTICE 'Added: theme column to word_lists';
  RAISE NOTICE 'Added: class_code column to users';
  RAISE NOTICE 'Updated: learning_sessions with 3-phase system columns';
END $$;
