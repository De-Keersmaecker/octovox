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

        -- Add foreign key constraint to classes table
        ALTER TABLE users
        ADD CONSTRAINT fk_users_class_code
        FOREIGN KEY (class_code)
        REFERENCES classes(code)
        ON DELETE SET NULL;

        RAISE NOTICE 'Added class_code column to users table';
    ELSE
        RAISE NOTICE 'class_code column already exists in users table';
    END IF;
END $$;