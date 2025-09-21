const { Client } = require('pg');
require('dotenv').config();

const initializeDatabase = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Schema creation
    console.log('📊 Creating database schema...');

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Classes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        class_code VARCHAR(10) UNIQUE NOT NULL,
        teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Class memberships
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_memberships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, class_id)
      )
    `);

    // Word lists
    await client.query(`
      CREATE TABLE IF NOT EXISTS word_lists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Class word list assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_word_list_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(class_id, list_id)
      )
    `);

    // Words
    await client.query(`
      CREATE TABLE IF NOT EXISTS words (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
        base_form VARCHAR(255) NOT NULL,
        definition TEXT NOT NULL,
        example_sentence TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Student progress
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        word_id UUID REFERENCES words(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'unseen' CHECK (status IN ('unseen', 'learning', 'mastered')),
        current_phase INTEGER DEFAULT 1,
        times_incorrect INTEGER DEFAULT 0,
        times_correct INTEGER DEFAULT 0,
        last_practiced TIMESTAMP,
        next_review TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, word_id)
      )
    `);

    // Learning sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
        words_practiced INTEGER DEFAULT 0,
        words_correct INTEGER DEFAULT 0,
        session_duration INTEGER,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // Motivational content
    await client.query(`
      CREATE TABLE IF NOT EXISTS motivational_content (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) CHECK (type IN ('text', 'image', 'video')),
        content_text TEXT,
        content_url VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Schema created successfully');

    // Check if data already exists
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('📝 Database already has data, skipping seed data');
      return;
    }

    console.log('🌱 Adding seed data...');

    // Insert sample teacher
    await client.query(`
      INSERT INTO users (email, name, password_hash, role, is_verified) VALUES
      ('teacher@octovox.be', 'Jan Janssen', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6B6L0rAiJW', 'teacher', TRUE)
    `);

    // Insert sample classes
    await client.query(`
      INSERT INTO classes (name, class_code, teacher_id) VALUES
      ('Klas 3A', 'KL3A2024', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
      ('Klas 3B', 'KL3B2024', (SELECT id FROM users WHERE email = 'teacher@octovox.be'))
    `);

    // Insert sample word lists
    await client.query(`
      INSERT INTO word_lists (title, creator_id) VALUES
      ('Hoofdstuk 1: Basis Woordenschat', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
      ('Thema: Sport en Beweging', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
      ('Engels: Daily Routine', (SELECT id FROM users WHERE email = 'teacher@octovox.be'))
    `);

    // Insert sample words for Dutch vocabulary
    await client.query(`
      INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
      ((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'huis', 'Een gebouw waar mensen wonen', 'Ik woon in een groot huis.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'auto', 'Een voertuig met vier wielen', 'Mijn vader rijdt een blauwe auto.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'school', 'Een plaats waar kinderen leren', 'Ik ga elke dag naar school.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'boek', 'Een verzameling paginas met tekst', 'Ik lees een interessant boek.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), 'water', 'Een heldere vloeistof die we drinken', 'Ik drink veel water.', TRUE)
    `);

    // Insert sample words for Sports
    await client.query(`
      INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
      ((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'voetbal', 'Een sport met een bal en twee teams', 'Ik speel graag voetbal.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'zwemmen', 'Bewegen door het water', 'Ik ga zwemmen in het zwembad.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'rennen', 'Snel bewegen op je benen', 'Ik kan heel snel rennen.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), 'fietsen', 'Rijden op een fiets', 'Ik ga fietsen naar school.', TRUE)
    `);

    // Insert sample words for English
    await client.query(`
      INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
      ((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'wake up', 'opstaan uit bed', 'I wake up at 7 AM every day.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'breakfast', 'de eerste maaltijd van de dag', 'I eat breakfast with my family.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'brush teeth', 'tanden poetsen', 'I brush my teeth before bed.', TRUE),
      ((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), 'homework', 'schoolwerk thuis', 'I do my homework after dinner.', TRUE)
    `);

    // Assign word lists to classes
    await client.query(`
      INSERT INTO class_word_list_assignments (class_id, list_id) VALUES
      ((SELECT id FROM classes WHERE class_code = 'KL3A2024'), (SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat')),
      ((SELECT id FROM classes WHERE class_code = 'KL3A2024'), (SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging')),
      ((SELECT id FROM classes WHERE class_code = 'KL3B2024'), (SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat')),
      ((SELECT id FROM classes WHERE class_code = 'KL3B2024'), (SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'))
    `);

    console.log('✅ Seed data added successfully');
    console.log('');
    console.log('🎉 Database initialization complete!');
    console.log('');
    console.log('📝 Test data created:');
    console.log('   Teacher: teacher@octovox.be (password: teacher123)');
    console.log('   Class codes: KL3A2024, KL3B2024');
    console.log('   Word lists: 3 lists with 13 total words');
    console.log('');
    console.log('🚀 You can now test student registration with class codes!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };