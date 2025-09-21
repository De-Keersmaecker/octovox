const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.argv[2];

if (!DATABASE_URL) {
  console.error('Please provide DATABASE_URL as an argument');
  console.error('Usage: node init-database.js "postgresql://..."');
  process.exit(1);
}

async function initDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read and execute schema
    console.log('📊 Creating tables...');
    const schema = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema created successfully');

    // Read and execute seed data
    console.log('🌱 Adding seed data...');
    const seed = fs.readFileSync(path.join(__dirname, 'database', 'seed.sql'), 'utf8');
    await client.query(seed);
    console.log('✅ Seed data added successfully');

    console.log('🎉 Database initialization complete!');
    console.log('\n📝 Test credentials:');
    console.log('Teacher: teacher@octovox.be');
    console.log('Students: student1@octovox.be, student2@octovox.be, student3@octovox.be');
    console.log('Password for all: (you need to update these in the seed data)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();