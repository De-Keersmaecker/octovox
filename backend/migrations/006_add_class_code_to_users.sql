-- Add class_code column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'class_code'
    ) THEN
        ALTER TABLE users ADD COLUMN class_code VARCHAR(50);

        -- Add index for faster queries
        CREATE INDEX idx_users_class_code ON users(class_code);

        RAISE NOTICE 'Added class_code column to users table';
    ELSE
        RAISE NOTICE 'class_code column already exists in users table';
    END IF;
END $$;