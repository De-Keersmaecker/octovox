const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? {
    rejectUnauthorized: false
  } : false
});

async function createAdmin() {
  try {
    const email = 'jelledekeersmaecker@gmail.com';
    const name = 'Jelle De Keersmaecker';
    const password = 'Admin2024!'; // You can change this
    const role = 'administrator';

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      // Update existing user to administrator
      await pool.query(
        'UPDATE users SET role = $1 WHERE email = $2',
        [role, email]
      );
      console.log(`Updated ${email} to administrator role`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4)',
        [email, name, hashedPassword, role]
      );
      console.log(`Created administrator account for ${email}`);
      console.log(`Password: ${password}`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();