-- Create table to assign word lists to classes
CREATE TABLE IF NOT EXISTS class_word_lists (
  id SERIAL PRIMARY KEY,
  class_code VARCHAR(50) NOT NULL,
  list_id INTEGER NOT NULL REFERENCES word_lists(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(class_code, list_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_class_word_lists_class ON class_word_lists(class_code);
CREATE INDEX idx_class_word_lists_list ON class_word_lists(list_id);

-- Assign all existing word lists to all classes by default
INSERT INTO class_word_lists (class_code, list_id, is_active)
SELECT
  c.code,
  wl.id,
  true
FROM classes c
CROSS JOIN word_lists wl
ON CONFLICT (class_code, list_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE class_word_lists IS 'Links word lists to specific classes, allowing teachers to control which lists their students can access';