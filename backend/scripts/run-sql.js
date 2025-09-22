const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use Railway production database URL
const DATABASE_URL = 'postgresql://postgres:vFKbJReBWJAOVeOTdKJjSMgLLJwGlkGb@junction.proxy.rlwy.net:43071/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSQL() {
  try {
    console.log('Connecting to Railway database...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'test-data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL commands...');

    // Execute the SQL
    const result = await pool.query(sql);

    console.log('✅ Test data setup completed successfully!');
    console.log('Results:', result);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    await pool.end();
    process.exit(1);
  }
}

runSQL();