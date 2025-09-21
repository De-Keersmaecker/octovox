const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const migrate3PhaseSystem = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Connecting to database for 3-phase migration...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Lees de migratie SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrate-3-phase-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📊 Running 3-phase system migration...');
    await client.query(migrationSQL);

    console.log('✅ 3-phase system migration completed successfully');
    console.log('');
    console.log('🎉 New tables created:');
    console.log('   - learning_sessions (sessie management)');
    console.log('   - battery_progress (batterij voortgang)');
    console.log('   - word_attempts (antwoord pogingen)');
    console.log('   - word_phase_status (woord status per fase)');
    console.log('   - revision_queue (revisie planning)');
    console.log('');
    console.log('🚀 3-phase learning system is ready!');

  } catch (error) {
    console.error('❌ 3-phase migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// Run if called directly
if (require.main === module) {
  migrate3PhaseSystem()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate3PhaseSystem };