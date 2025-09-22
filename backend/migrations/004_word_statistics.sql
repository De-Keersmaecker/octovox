-- Create word_statistics table for tracking difficulty per class
CREATE TABLE IF NOT EXISTS word_statistics (
  id SERIAL PRIMARY KEY,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  class_code VARCHAR(50),
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0,
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(word_id, class_code)
);

-- Create index for faster queries
CREATE INDEX idx_word_statistics_accuracy ON word_statistics(accuracy_rate);
CREATE INDEX idx_word_statistics_class ON word_statistics(class_code);
CREATE INDEX idx_word_statistics_word ON word_statistics(word_id);

-- Create function to update statistics from practice_attempts
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
    (SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)::DECIMAL * 100) as accuracy_rate
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
    (SUM(correct_attempts)::DECIMAL / SUM(total_attempts)::DECIMAL * 100) as accuracy_rate
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