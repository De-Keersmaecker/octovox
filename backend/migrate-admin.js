const { Client } = require('pg');
require('dotenv').config();

const migrateAdminFeatures = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Connecting to database for admin features migration...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('📊 Running admin features migration...');

    const migrationSQL = `
      -- Add theme column to word_lists if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'word_lists' AND column_name = 'theme') THEN
          ALTER TABLE word_lists ADD COLUMN theme VARCHAR(255);
        END IF;
      END $$;

      -- Add created_at and updated_at to word_lists if they don't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'word_lists' AND column_name = 'created_at') THEN
          ALTER TABLE word_lists ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'word_lists' AND column_name = 'updated_at') THEN
          ALTER TABLE word_lists ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
      END $$;

      -- Update existing word_lists with current timestamp if they have NULL values
      UPDATE word_lists
      SET created_at = NOW(), updated_at = NOW()
      WHERE created_at IS NULL OR updated_at IS NULL;

      -- Create upload_sessions table for tracking Excel uploads
      CREATE TABLE IF NOT EXISTS upload_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
        total_words INTEGER DEFAULT 0,
        processed_words INTEGER DEFAULT 0,
        errors TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create word_templates table for Excel template downloads
      CREATE TABLE IF NOT EXISTS word_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        theme VARCHAR(255) NOT NULL,
        sample_words JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create trigger for automatic updated_at on word_lists
      CREATE OR REPLACE FUNCTION update_word_lists_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_word_lists_updated_at_trigger ON word_lists;
      CREATE TRIGGER update_word_lists_updated_at_trigger
        BEFORE UPDATE ON word_lists
        FOR EACH ROW EXECUTE FUNCTION update_word_lists_updated_at();

      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_upload_sessions_admin ON upload_sessions(admin_id);
      CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_word_lists_theme ON word_lists(theme);
      CREATE INDEX IF NOT EXISTS idx_word_lists_updated_at ON word_lists(updated_at);
    `;

    await client.query(migrationSQL);

    console.log('✅ Admin features migration completed successfully');
    console.log('');
    console.log('🎉 New features added:');
    console.log('   - Theme column for word_lists');
    console.log('   - Timestamps for word_lists (created_at, updated_at)');
    console.log('   - upload_sessions table for Excel upload tracking');
    console.log('   - word_templates table for sample data');
    console.log('   - Automatic updated_at trigger');
    console.log('');
    console.log('🚀 Administrator functionality is ready!');

  } catch (error) {
    console.error('❌ Admin migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// Run if called directly
if (require.main === module) {
  migrateAdminFeatures()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateAdminFeatures };