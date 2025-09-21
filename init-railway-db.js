const { Client } = require('pg');

// Use the public DATABASE_URL for external connections
const DATABASE_URL = 'postgresql://postgres:qpEOMYKdTvOJQTHkjONXyRitOyYMkTiI@ballast.proxy.rlwy.net:55224/railway';

const initializeDatabase = async () => {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Connecting to Railway database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Check if tables already exist
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('📋 Tables already exist, checking for data...');

      const userCount = await client.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) > 0) {
        console.log('📝 Database already initialized with data');
        return;
      }
    }

    console.log('📊 Creating database schema...');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create all tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        class_code VARCHAR(10) UNIQUE NOT NULL,
        teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS class_memberships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, class_id)
      )`,

      `CREATE TABLE IF NOT EXISTS word_lists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS class_word_list_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(class_id, list_id)
      )`,

      `CREATE TABLE IF NOT EXISTS words (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
        base_form VARCHAR(255) NOT NULL,
        definition TEXT NOT NULL,
        example_sentence TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS student_progress (
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
      )`,

      `CREATE TABLE IF NOT EXISTS learning_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
        words_practiced INTEGER DEFAULT 0,
        words_correct INTEGER DEFAULT 0,
        session_duration INTEGER,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS motivational_content (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) CHECK (type IN ('text', 'image', 'video')),
        content_text TEXT,
        content_url VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`
    ];

    for (const table of tables) {
      await client.query(table);
    }

    console.log('✅ Schema created successfully');
    console.log('🌱 Adding seed data...');

    // Insert teacher (password will be "teacher123" when hashed)
    await client.query(`
      INSERT INTO users (email, name, password_hash, role, is_verified) VALUES
      ('teacher@octovox.be', 'Jan Janssen', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6B6L0rAiJW', 'teacher', TRUE)
    `);

    // Insert classes
    await client.query(`
      INSERT INTO classes (name, class_code, teacher_id) VALUES
      ('Klas 3A', 'KL3A2024', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
      ('Klas 3B', 'KL3B2024', (SELECT id FROM users WHERE email = 'teacher@octovox.be'))
    `);

    // Insert word lists
    await client.query(`
      INSERT INTO word_lists (title, creator_id) VALUES
      ('Hoofdstuk 1: Basis Woordenschat', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
      ('Thema: Sport en Beweging', (SELECT id FROM users WHERE email = 'teacher@octovox.be')),
      ('Engels: Daily Routine', (SELECT id FROM users WHERE email = 'teacher@octovox.be'))
    `);

    // Insert words for Dutch vocabulary
    const dutchWords = [
      ['huis', 'Een gebouw waar mensen wonen', 'Ik woon in een groot huis.'],
      ['auto', 'Een voertuig met vier wielen', 'Mijn vader rijdt een blauwe auto.'],
      ['school', 'Een plaats waar kinderen leren', 'Ik ga elke dag naar school.'],
      ['boek', 'Een verzameling paginas met tekst', 'Ik lees een interessant boek.'],
      ['water', 'Een heldere vloeistof die we drinken', 'Ik drink veel water.']
    ];

    for (const [word, definition, example] of dutchWords) {
      await client.query(`
        INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
        ((SELECT id FROM word_lists WHERE title = 'Hoofdstuk 1: Basis Woordenschat'), $1, $2, $3, TRUE)
      `, [word, definition, example]);
    }

    // Insert words for Sports
    const sportsWords = [
      ['voetbal', 'Een sport met een bal en twee teams', 'Ik speel graag voetbal.'],
      ['zwemmen', 'Bewegen door het water', 'Ik ga zwemmen in het zwembad.'],
      ['rennen', 'Snel bewegen op je benen', 'Ik kan heel snel rennen.'],
      ['fietsen', 'Rijden op een fiets', 'Ik ga fietsen naar school.']
    ];

    for (const [word, definition, example] of sportsWords) {
      await client.query(`
        INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
        ((SELECT id FROM word_lists WHERE title = 'Thema: Sport en Beweging'), $1, $2, $3, TRUE)
      `, [word, definition, example]);
    }

    // Insert words for English
    const englishWords = [
      ['wake up', 'opstaan uit bed', 'I wake up at 7 AM every day.'],
      ['breakfast', 'de eerste maaltijd van de dag', 'I eat breakfast with my family.'],
      ['brush teeth', 'tanden poetsen', 'I brush my teeth before bed.'],
      ['homework', 'schoolwerk thuis', 'I do my homework after dinner.']
    ];

    for (const [word, definition, example] of englishWords) {
      await client.query(`
        INSERT INTO words (list_id, base_form, definition, example_sentence, is_active) VALUES
        ((SELECT id FROM word_lists WHERE title = 'Engels: Daily Routine'), $1, $2, $3, TRUE)
      `, [word, definition, example]);
    }

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
    console.log('   Class codes: KL3A2024, KL3B2024');
    console.log('   Word lists: 3 lists with 13 total words');
    console.log('   Ready for student registration!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};

initializeDatabase()
  .then(() => {
    console.log('✅ Database initialization completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  });