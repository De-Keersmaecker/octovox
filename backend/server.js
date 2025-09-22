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

// Force redeploy trigger

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

// Admin password reset endpoint
app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password required' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      email: result.rows[0].email
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
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

// 3-Phase system migration endpoint
app.post('/api/admin/migrate-3-phase', async (req, res) => {
  try {
    const { migrate3PhaseSystem } = require('./migrate-3-phase');
    await migrate3PhaseSystem();
    res.json({
      success: true,
      message: '3-phase system migration completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('3-phase migration error:', error);
    res.status(500).json({
      success: false,
      error: '3-phase migration failed',
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

    // Get assigned lists for this student
    const assignedListsQuery = `
      SELECT DISTINCT wl.id
      FROM word_lists wl
      JOIN class_word_list_assignments cwla ON wl.id = cwla.list_id
      JOIN class_memberships cm ON cwla.class_id = cm.class_id
      WHERE cm.user_id = $1 ${listId ? 'AND wl.id = $2' : ''}
    `;

    const params = listId ? [userId, listId] : [userId];
    const assignedLists = await db.query(assignedListsQuery, params);

    if (assignedLists.rows.length === 0) {
      return res.status(404).json({ error: 'No assigned word lists found' });
    }

    // Get practice words with spaced repetition logic
    const listIds = assignedLists.rows.map(row => row.id);

    if (listIds.length === 0) {
      return res.json({ words: [], totalWords: 0 });
    }

    const placeholders = listIds.map((_, index) => `$${index + 2}`).join(',');

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

    const wordsResult = await db.query(wordsQuery, [userId, ...listIds]);

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
    res.status(500).json({ error: 'Internal server error' });
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

// 3-Phase Learning System API Endpoints

// Get or create learning session for a word list
app.get('/api/learning/session/:listId', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { listId } = req.params;

    // Check if session exists
    let session = await db.query(
      'SELECT * FROM learning_sessions WHERE user_id = $1 AND list_id = $2',
      [userId, listId]
    );

    let isNewSession = false;
    let sessionData;

    if (session.rows.length === 0) {
      // Create new session
      const newSession = await db.query(
        `INSERT INTO learning_sessions (user_id, list_id, current_phase, current_battery_number)
         VALUES ($1, $2, 1, 1) RETURNING *`,
        [userId, listId]
      );
      sessionData = newSession.rows[0];
      isNewSession = true;
    } else {
      sessionData = session.rows[0];
    }

    res.json({
      session: sessionData,
      message: isNewSession ? 'New session created' : 'Existing session retrieved'
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current battery for a session
app.get('/api/learning/battery/:sessionId', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify session belongs to user
    const session = await db.query(
      'SELECT * FROM learning_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentSession = session.rows[0];

    // Get or create current battery
    let battery = await db.query(
      `SELECT * FROM battery_progress
       WHERE session_id = $1 AND battery_number = $2 AND phase = $3`,
      [sessionId, currentSession.current_battery_number, currentSession.current_phase]
    );

    if (battery.rows.length === 0) {
      // Create new battery - this will be implemented in the battery composition algorithm
      const newBattery = await createBatteryForSession(sessionId, currentSession);
      battery = { rows: [newBattery] };
    }

    const currentBattery = battery.rows[0];

    // Get word details for this battery
    const wordIds = currentBattery.words_in_battery;
    if (wordIds.length === 0) {
      return res.json({ battery: currentBattery, words: [], statuses: [] });
    }

    const placeholders = wordIds.map((_, index) => `$${index + 1}`).join(',');
    const words = await db.query(
      `SELECT id, base_form, definition, example_sentence FROM words WHERE id IN (${placeholders})`,
      wordIds
    );

    // Get word phase statuses
    const statusPlaceholders = wordIds.map((_, index) => `$${index + 3}`).join(',');
    const statuses = await db.query(
      `SELECT word_id, status FROM word_phase_status
       WHERE user_id = $1 AND phase = $2 AND word_id IN (${statusPlaceholders})`,
      [userId, currentSession.current_phase, ...wordIds]
    );

    res.json({
      battery: currentBattery,
      words: words.rows,
      statuses: statuses.rows,
      session: currentSession
    });
  } catch (error) {
    console.error('Get battery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit answer attempt
app.post('/api/learning/attempt', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId, wordId, phase, batteryNumber, isCorrect, responseGiven, responseTime, autocorrectApplied } = req.body;

    // Verify session belongs to user
    const session = await db.query(
      'SELECT * FROM learning_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get current attempt number for this word
    const attemptCount = await db.query(
      `SELECT COUNT(*) FROM word_attempts
       WHERE session_id = $1 AND word_id = $2 AND phase = $3 AND battery_number = $4`,
      [sessionId, wordId, phase, batteryNumber]
    );

    const attemptNumber = parseInt(attemptCount.rows[0].count) + 1;

    // Record the attempt
    await db.query(
      `INSERT INTO word_attempts
       (session_id, word_id, phase, battery_number, attempt_number, is_correct, response_given, response_time, autocorrect_applied)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [sessionId, wordId, phase, batteryNumber, attemptNumber, isCorrect, responseGiven, responseTime, autocorrectApplied || false]
    );

    // Update or create word phase status
    const statusResult = await db.query(
      `INSERT INTO word_phase_status (user_id, word_id, phase, status, first_attempt_correct, total_attempts, last_attempt_at)
       VALUES ($1, $2, $3, $4, $5, 1, NOW())
       ON CONFLICT (user_id, word_id, phase)
       DO UPDATE SET
         status = $4,
         total_attempts = word_phase_status.total_attempts + 1,
         last_attempt_at = NOW(),
         first_attempt_correct = CASE
           WHEN word_phase_status.total_attempts = 0 THEN $5
           ELSE word_phase_status.first_attempt_correct
         END
       RETURNING *`,
      [userId, wordId, phase, isCorrect ? 'green' : 'orange', attemptNumber === 1 ? isCorrect : null]
    );

    res.json({
      success: true,
      attemptNumber,
      wordStatus: statusResult.rows[0]
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause session
app.post('/api/learning/session/:sessionId/pause', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    await db.query(
      `UPDATE learning_sessions
       SET session_state = 'paused', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    res.json({ success: true, message: 'Session paused' });
  } catch (error) {
    console.error('Pause session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resume session
app.post('/api/learning/session/:sessionId/resume', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    await db.query(
      `UPDATE learning_sessions
       SET session_state = 'active', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    res.json({ success: true, message: 'Session resumed' });
  } catch (error) {
    console.error('Resume session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move to next phase with current battery words
app.post('/api/learning/session/next-phase', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.body;

    // Verify session belongs to user
    const session = await db.query(
      'SELECT * FROM learning_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentSession = session.rows[0];

    if (currentSession.current_phase >= 3) {
      return res.status(400).json({ error: 'Already at final phase' });
    }

    // Move to next phase, keep same battery number (start over with same words)
    await db.query(
      `UPDATE learning_sessions
       SET current_phase = $1, updated_at = NOW()
       WHERE id = $2`,
      [currentSession.current_phase + 1, sessionId]
    );

    res.json({ success: true, message: 'Moved to next phase' });
  } catch (error) {
    console.error('Next phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete battery and progress to next
app.post('/api/learning/battery/complete', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId, batteryId } = req.body;

    // Verify session belongs to user
    const session = await db.query(
      'SELECT * FROM learning_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentSession = session.rows[0];

    // Mark current battery as completed
    await db.query(
      'UPDATE battery_progress SET battery_state = $1, completed_at = NOW() WHERE id = $2',
      ['completed', batteryId]
    );

    // Check if all words in current phase are green
    const allWordsInPhase = await db.query(
      `SELECT COUNT(*) as total_words
       FROM words w
       JOIN word_lists wl ON w.list_id = wl.id
       JOIN class_word_list_assignments cwla ON wl.id = cwla.list_id
       JOIN class_memberships cm ON cwla.class_id = cm.class_id
       WHERE cm.user_id = $1 AND wl.id = $2 AND w.is_active = true`,
      [userId, currentSession.list_id]
    );

    const greenWordsInPhase = await db.query(
      `SELECT COUNT(*) as green_words
       FROM word_phase_status wps
       JOIN words w ON wps.word_id = w.id
       WHERE wps.user_id = $1 AND w.list_id = $2 AND wps.phase = $3 AND wps.status = 'green'`,
      [userId, currentSession.list_id, currentSession.current_phase]
    );

    const totalWords = parseInt(allWordsInPhase.rows[0].total_words);
    const greenWords = parseInt(greenWordsInPhase.rows[0].green_words);

    if (greenWords >= totalWords) {
      // All words in current phase are green, move to next phase
      if (currentSession.current_phase < 3) {
        await db.query(
          `UPDATE learning_sessions
           SET current_phase = $1, current_battery_number = 1, updated_at = NOW()
           WHERE id = $2`,
          [currentSession.current_phase + 1, sessionId]
        );
      } else {
        // All phases complete
        await db.query(
          `UPDATE learning_sessions
           SET session_state = 'completed', completed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [sessionId]
        );
      }
    } else {
      // More batteries needed in current phase
      await db.query(
        `UPDATE learning_sessions
         SET current_battery_number = $1, updated_at = NOW()
         WHERE id = $2`,
        [currentSession.current_battery_number + 1, sessionId]
      );
    }

    res.json({ success: true, message: 'Battery completed' });
  } catch (error) {
    console.error('Complete battery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Administrator login
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const userResult = await db.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1 AND role = $2',
      [email, 'administrator']
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
      message: 'Admin login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to require administrator role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
};

// Admin: Get all word lists with statistics
app.get('/api/admin/word-lists', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT
        wl.id,
        wl.title,
        wl.theme,
        wl.created_at,
        wl.updated_at,
        COUNT(w.id) as total_words,
        COUNT(CASE WHEN w.is_active = true THEN 1 END) as active_words,
        u.name as creator_name
      FROM word_lists wl
      LEFT JOIN words w ON wl.id = w.list_id
      LEFT JOIN users u ON wl.creator_id = u.id
      GROUP BY wl.id, wl.title, wl.theme, wl.created_at, wl.updated_at, u.name
      ORDER BY wl.updated_at DESC
    `;

    const result = await db.query(query);
    res.json({ wordLists: result.rows });
  } catch (error) {
    console.error('Get word lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get words for a specific list
app.get('/api/admin/word-lists/:listId/words', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { listId } = req.params;

    const words = await db.query(
      `SELECT id, base_form, definition, example_sentence, is_active
       FROM words
       WHERE list_id = $1
       ORDER BY base_form`,
      [listId]
    );

    const listInfo = await db.query(
      'SELECT title, theme FROM word_lists WHERE id = $1',
      [listId]
    );

    res.json({
      list: listInfo.rows[0],
      words: words.rows
    });
  } catch (error) {
    console.error('Get words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Create new word list
app.post('/api/admin/word-lists', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, theme } = req.body;
    const creatorId = req.user.userId;

    const result = await db.query(
      'INSERT INTO word_lists (title, theme, creator_id) VALUES ($1, $2, $3) RETURNING *',
      [title, theme || null, creatorId]
    );

    res.json({ wordList: result.rows[0] });
  } catch (error) {
    console.error('Create word list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Run migration
app.post('/api/admin/migrate', async (req, res) => {
  try {
    const { migrateAdminFeatures } = require('./migrate-admin');
    await migrateAdminFeatures();
    res.json({ success: true, message: 'Admin migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
});

// Admin: Create admin account (for initial setup)
app.post('/api/admin/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if admin already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (email, name, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, name, hashedPassword, 'administrator', true]
    );

    res.json({
      success: true,
      message: 'Administrator account created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete word list
app.delete('/api/admin/word-lists/:listId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { listId } = req.params;

    // Check if list exists and get info
    const listCheck = await db.query(
      'SELECT title FROM word_lists WHERE id = $1',
      [listId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Word list not found' });
    }

    // Delete associated data in correct order
    await db.query('DELETE FROM class_word_list_assignments WHERE list_id = $1', [listId]);
    await db.query('DELETE FROM words WHERE list_id = $1', [listId]);
    await db.query('DELETE FROM word_lists WHERE id = $1', [listId]);

    res.json({ message: 'Word list deleted successfully' });
  } catch (error) {
    console.error('Delete word list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to create a new battery with intelligent word selection
async function createBatteryForSession(sessionId, session) {
  try {
    const userId = session.user_id;
    const currentPhase = session.current_phase;

    // Get all words from the assigned word list
    const allWordsQuery = `
      SELECT w.id, w.base_form, w.definition, w.example_sentence,
             COALESCE(wps.status, 'unseen') as current_status,
             COALESCE(wps.total_attempts, 0) as total_attempts
      FROM words w
      JOIN word_lists wl ON w.list_id = wl.id
      JOIN learning_sessions ls ON wl.id = ls.list_id
      LEFT JOIN word_phase_status wps ON w.id = wps.word_id
        AND wps.user_id = $1 AND wps.phase = $2
      WHERE ls.id = $3 AND w.is_active = TRUE
      ORDER BY
        CASE
          WHEN wps.status = 'orange' THEN 1  -- Orange words get priority
          WHEN wps.status IS NULL THEN 2     -- Unseen words next
          WHEN wps.status = 'green' THEN 3   -- Green words last
          ELSE 4
        END,
        wps.total_attempts DESC,  -- More attempts = higher priority for orange words
        RANDOM()  -- Random within same priority
    `;

    const allWords = await db.query(allWordsQuery, [userId, currentPhase, sessionId]);

    if (allWords.rows.length === 0) {
      throw new Error('No words available for this list');
    }

    // Select up to 5 words for the battery
    const selectedWords = allWords.rows.slice(0, Math.min(5, allWords.rows.length));
    const wordIds = selectedWords.map(word => word.id);

    // If we have less than 5 words and this isn't the first battery,
    // fill up with words from previous batteries for multiple choice options
    if (wordIds.length < 5 && session.current_battery_number > 1) {
      const previousBatteryWords = await db.query(
        `SELECT DISTINCT jsonb_array_elements_text(words_in_battery) as word_id
         FROM battery_progress
         WHERE session_id = $1 AND battery_number < $2 AND phase = $3
         LIMIT $4`,
        [sessionId, session.current_battery_number, currentPhase, 5 - wordIds.length]
      );

      const additionalWordIds = previousBatteryWords.rows.map(row => row.word_id);
      wordIds.push(...additionalWordIds);
    }

    // Create the battery record
    const battery = await db.query(
      `INSERT INTO battery_progress (session_id, battery_number, phase, words_in_battery)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [sessionId, session.current_battery_number, session.current_phase, JSON.stringify(wordIds)]
    );

    console.log(`Created battery ${session.current_battery_number} for phase ${currentPhase} with ${wordIds.length} words`);
    return battery.rows[0];

  } catch (error) {
    console.error('Error creating battery:', error);
    throw error;
  }
}

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