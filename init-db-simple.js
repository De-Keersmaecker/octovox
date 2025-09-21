const https = require('https');
const fs = require('fs');

// Parse DATABASE_URL
const dbUrl = process.argv[2];
if (!dbUrl) {
  console.error('Usage: node init-db-simple.js "DATABASE_URL"');
  process.exit(1);
}

console.log('🔧 Initializing database...');
console.log('📝 For security, you should run this via Railway CLI or psql directly:');
console.log('');
console.log('1. Install Railway CLI:');
console.log('   npm install -g @railway/cli');
console.log('');
console.log('2. Connect to your database:');
console.log('   railway connect');
console.log('   (Select your PostgreSQL service)');
console.log('');
console.log('3. Run these commands in the connected shell:');
console.log('   \\i database/schema.sql');
console.log('   \\i database/seed.sql');
console.log('');
console.log('OR use psql directly:');
console.log(`   psql "${dbUrl}" < database/schema.sql`);
console.log(`   psql "${dbUrl}" < database/seed.sql`);
console.log('');
console.log('✅ Your database URL is ready to use for the backend deployment.');
console.log('📋 Save this for your backend environment variables:');
console.log('');
console.log('DATABASE_URL=' + dbUrl.replace('ballast.proxy.rlwy.net', 'postgres.railway.internal'));
console.log('');
console.log('(Use the internal URL for Railway-to-Railway connections)');