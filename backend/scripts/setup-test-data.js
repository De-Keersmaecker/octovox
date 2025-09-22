const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? {
    rejectUnauthorized: false
  } : false
});

async function setupTestData() {
  try {
    console.log('Setting up test data...');

    // 1. Create test classes
    const class1 = await pool.query(
      `INSERT INTO classes (code, name, teacher_id, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['CLASS2024', 'Klas 6A - 2024', null]
    );

    const class2 = await pool.query(
      `INSERT INTO classes (code, name, teacher_id, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['CLASS2025', 'Klas 6B - 2024', null]
    );

    console.log('Created test classes');

    // 2. Create test students
    const hashedPassword = await bcrypt.hash('student123', 10);

    const students = [
      { email: 'anna@test.com', name: 'Anna Janssens', class_code: 'CLASS2024' },
      { email: 'pieter@test.com', name: 'Pieter De Vries', class_code: 'CLASS2024' },
      { email: 'emma@test.com', name: 'Emma Peeters', class_code: 'CLASS2025' },
      { email: 'lucas@test.com', name: 'Lucas Van Damme', class_code: 'CLASS2025' },
      { email: 'sophie@test.com', name: 'Sophie Willems', class_code: 'CLASS2024' }
    ];

    for (const student of students) {
      await pool.query(
        `INSERT INTO users (email, name, password, role, class_code)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET class_code = EXCLUDED.class_code`,
        [student.email, student.name, hashedPassword, 'student', student.class_code]
      );
    }

    console.log('Created test students');

    // 3. Create test teacher
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    await pool.query(
      `INSERT INTO users (email, name, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role`,
      ['teacher@test.com', 'Mevr. De Boeck', teacherPassword, 'teacher']
    );

    console.log('Created test teacher');

    // 4. Get some word lists
    const wordLists = await pool.query(
      'SELECT id FROM word_lists LIMIT 3'
    );

    if (wordLists.rows.length > 0) {
      // 5. Add practice sessions and attempts for students
      const studentUsers = await pool.query(
        `SELECT id, name FROM users WHERE role = 'student' AND email IN ('anna@test.com', 'pieter@test.com', 'emma@test.com')`
      );

      for (const student of studentUsers.rows) {
        for (const list of wordLists.rows) {
          // Create practice session
          const session = await pool.query(
            `INSERT INTO practice_sessions (user_id, list_id, started_at, phase, is_active)
             VALUES ($1, $2, NOW() - INTERVAL '1 day', 'BLIKSEM', false)
             RETURNING id`,
            [student.id, list.id]
          );

          // Get some words from the list
          const words = await pool.query(
            'SELECT id FROM words WHERE list_id = $1 LIMIT 10',
            [list.id]
          );

          // Add attempts with varying accuracy
          for (let i = 0; i < words.rows.length; i++) {
            const word = words.rows[i];
            const isCorrect = Math.random() > 0.3; // 70% accuracy average

            await pool.query(
              `INSERT INTO practice_attempts
               (session_id, word_id, user_id, phase, response_type, is_correct, attempted_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 day')`,
              [session.rows[0].id, word.id, student.id, 'BLIKSEM', 'TYPED', isCorrect]
            );
          }
        }
      }

      console.log('Created practice history');
    }

    // 6. Add word difficulty data
    const words = await pool.query(
      `SELECT w.id, w.base_form, w.list_id
       FROM words w
       INNER JOIN word_lists wl ON w.list_id = wl.id
       LIMIT 50`
    );

    for (const word of words.rows) {
      // Calculate difficulty based on random attempts
      const correctAttempts = Math.floor(Math.random() * 50) + 10;
      const totalAttempts = correctAttempts + Math.floor(Math.random() * 30) + 10;
      const accuracy = (correctAttempts / totalAttempts) * 100;

      await pool.query(
        `INSERT INTO word_statistics (word_id, class_code, total_attempts, correct_attempts, accuracy_rate)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (word_id, class_code)
         DO UPDATE SET
           total_attempts = EXCLUDED.total_attempts,
           correct_attempts = EXCLUDED.correct_attempts,
           accuracy_rate = EXCLUDED.accuracy_rate`,
        [word.id, 'CLASS2024', totalAttempts, correctAttempts, accuracy]
      );
    }

    console.log('Created word statistics');

    console.log('\n✅ Test data setup complete!');
    console.log('\n📝 Test Accounts:');
    console.log('Student: anna@test.com / student123');
    console.log('Teacher: teacher@test.com / teacher123');
    console.log('Admin: jelledekeersmaecker@gmail.com (use /dev)');

    await pool.end();
  } catch (error) {
    console.error('Error setting up test data:', error);
    await pool.end();
    process.exit(1);
  }
}

setupTestData();