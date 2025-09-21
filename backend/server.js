const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
let db;
const connectDB = async () => {
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  try {
    await db.connect();
    console.log('✅ Connected to PostgreSQL database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://octovox-frontend-production.up.railway.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `${role} access required` });
    }
    next();
  };
};

// Spaced repetition intervals (days)
const SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30];

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Octovox backend is running',
    database: db ? 'connected' : 'disconnected'
  });
});

// Database initialization endpoint
app.post('/api/admin/init-database', async (req, res) => {
  try {
    const { initializeDatabase } = require('./init-db');
    await initializeDatabase();
    res.json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Database initialization failed',
      details: error.message
    });
  }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password, classCode } = req.body;

    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if class exists
    const classResult = await db.query('SELECT id FROM classes WHERE class_code = $1', [classCode]);
    if (classResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid class code' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();

    // Create user
    const userResult = await db.query(
      `INSERT INTO users (email, name, password_hash, role, verification_token, is_verified)
       VALUES ($1, $2, $3, 'student', $4, TRUE) RETURNING id, email, name, role`,
      [email, name, hashedPassword, verificationToken]
    );

    const user = userResult.rows[0];
    const classId = classResult.rows[0].id;

    // Add user to class
    await db.query(
      'INSERT INTO class_memberships (user_id, class_id) VALUES ($1, $2)',
      [user.id, classId]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const userResult = await db.query(
      'SELECT id, email, name, password_hash, role, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/teacher-login', async (req, res) => {
  try {
    const { email, teacherCode } = req.body;

    if (teacherCode !== process.env.TEACHER_CODE) {
      return res.status(401).json({ error: 'Invalid teacher code' });
    }

    const userResult = await db.query(
      'SELECT id, email, name, role FROM users WHERE email = $1 AND role = $2',
      [email, 'teacher']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Teacher not found' });
    }

    const user = userResult.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    res.json({
      message: 'Teacher login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Learning routes (for students)
app.get('/api/learning/practice/:listId?', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { listId } = req.params;

    console.log('Practice request:', { userId, listId });

    // Get assigned lists for this student
    const assignedListsQuery = `
      SELECT DISTINCT wl.id
      FROM word_lists wl
      JOIN class_word_list_assignments cwla ON wl.id = cwla.list_id
      JOIN class_memberships cm ON cwla.class_id = cm.class_id
      WHERE cm.user_id = $1 ${listId ? 'AND wl.id = $2' : ''}
    `;

    const params = listId ? [userId, listId] : [userId];
    console.log('Assigned lists query params:', params);

    const assignedLists = await db.query(assignedListsQuery, params);
    console.log('Assigned lists result:', assignedLists.rows);

    if (assignedLists.rows.length === 0) {
      return res.status(404).json({ error: 'No assigned word lists found' });
    }

    // Get practice words with spaced repetition logic
    const listIds = assignedLists.rows.map(row => row.id);
    console.log('List IDs:', listIds);

    if (listIds.length === 0) {
      return res.json({ words: [], totalWords: 0 });
    }

    const placeholders = listIds.map((_, index) => `$${index + 2}`).join(',');
    console.log('Placeholders:', placeholders);

    const wordsQuery = `
      SELECT w.id, w.base_form, w.definition, w.example_sentence,
             COALESCE(sp.status, 'unseen') as status,
             COALESCE(sp.current_phase, 1) as current_phase,
             COALESCE(sp.next_review, NOW()) as next_review,
             CASE
               WHEN sp.status = 'learning' AND sp.next_review <= NOW() THEN 1
               WHEN sp.status IS NULL THEN 2
               ELSE 3
             END as priority
      FROM words w
      LEFT JOIN student_progress sp ON w.id = sp.word_id AND sp.user_id = $1
      WHERE w.list_id IN (${placeholders})
        AND w.is_active = TRUE
        AND (sp.status IS NULL OR sp.status != 'mastered' OR sp.next_review <= NOW())
      ORDER BY priority ASC, sp.next_review ASC NULLS FIRST, RANDOM()
      LIMIT 20
    `;

    console.log('Words query:', wordsQuery);
    console.log('Words query params:', [userId, ...listIds]);

    const wordsResult = await db.query(wordsQuery, [userId, ...listIds]);
    console.log('Words result:', wordsResult.rows.length, 'words found');

    const practiceWords = wordsResult.rows.map(word => ({
      id: word.id,
      baseForm: word.base_form,
      definition: word.definition,
      exampleSentence: word.example_sentence
    }));

    res.json({
      words: practiceWords,
      totalWords: practiceWords.length
    });
  } catch (error) {
    console.error('Get practice words error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/learning/practice/results', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'Invalid results format' });
    }

    for (const result of results) {
      const { wordId, isCorrect } = result;

      const progressResult = await db.query(
        'SELECT * FROM student_progress WHERE user_id = $1 AND word_id = $2',
        [userId, wordId]
      );

      if (progressResult.rows.length === 0) {
        // New word
        const nextReview = new Date();
        if (isCorrect) {
          nextReview.setDate(nextReview.getDate() + SPACED_REPETITION_INTERVALS[0]);
        }

        await db.query(
          `INSERT INTO student_progress
           (user_id, word_id, status, current_phase, times_correct, times_incorrect, last_practiced, next_review)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
          [
            userId,
            wordId,
            'learning',
            1,
            isCorrect ? 1 : 0,
            isCorrect ? 0 : 1,
            nextReview
          ]
        );
      } else {
        // Update existing progress
        const progress = progressResult.rows[0];
        let newPhase = progress.current_phase;
        let newStatus = progress.status;
        let timesCorrect = progress.times_correct;
        let timesIncorrect = progress.times_incorrect;

        if (isCorrect) {
          timesCorrect++;
          if (newPhase < SPACED_REPETITION_INTERVALS.length) {
            newPhase++;
          }
          if (newPhase >= SPACED_REPETITION_INTERVALS.length) {
            newStatus = 'mastered';
          }
        } else {
          timesIncorrect++;
          newPhase = Math.max(1, newPhase - 1);
          newStatus = 'learning';
        }

        const nextReview = new Date();
        const intervalIndex = Math.min(newPhase - 1, SPACED_REPETITION_INTERVALS.length - 1);
        nextReview.setDate(nextReview.getDate() + SPACED_REPETITION_INTERVALS[intervalIndex]);

        await db.query(
          `UPDATE student_progress
           SET status = $1, current_phase = $2, times_correct = $3, times_incorrect = $4,
               last_practiced = NOW(), next_review = $5, updated_at = NOW()
           WHERE user_id = $6 AND word_id = $7`,
          [newStatus, newPhase, timesCorrect, timesIncorrect, nextReview, userId, wordId]
        );
      }
    }

    const correctCount = results.filter(r => r.isCorrect).length;
    const totalCount = results.length;

    res.json({
      message: 'Practice results submitted successfully',
      summary: {
        totalWords: totalCount,
        correctWords: correctCount,
        accuracy: Math.round((correctCount / totalCount) * 100)
      }
    });
  } catch (error) {
    console.error('Submit practice results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/learning/progress', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.userId;

    const progressQuery = `
      SELECT
        wl.id as list_id,
        wl.title,
        COUNT(w.id) as total_words,
        COUNT(CASE WHEN sp.status = 'mastered' THEN 1 END) as mastered_words,
        COUNT(CASE WHEN sp.status = 'learning' THEN 1 END) as learning_words,
        COUNT(CASE WHEN sp.status IS NULL THEN 1 END) as unseen_words
      FROM word_lists wl
      JOIN class_word_list_assignments cwla ON wl.id = cwla.list_id
      JOIN class_memberships cm ON cwla.class_id = cm.class_id
      JOIN words w ON wl.id = w.list_id AND w.is_active = TRUE
      LEFT JOIN student_progress sp ON w.id = sp.word_id AND sp.user_id = $1
      WHERE cm.user_id = $1
      GROUP BY wl.id, wl.title
      ORDER BY wl.title
    `;

    const result = await db.query(progressQuery, [userId]);

    const progress = result.rows.map(row => ({
      listId: row.list_id,
      title: row.title,
      totalWords: parseInt(row.total_words),
      masteredWords: parseInt(row.mastered_words),
      learningWords: parseInt(row.learning_words),
      unseenWords: parseInt(row.unseen_words),
      progressPercentage: Math.round((parseInt(row.mastered_words) / parseInt(row.total_words)) * 100)
    }));

    res.json({ progress });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch all route
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Octovox backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();