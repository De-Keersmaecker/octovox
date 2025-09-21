import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest, PracticeWord, PracticeResult } from '../types';

const SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30]; // days

export const getPracticeWords = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { listId } = req.params;

    const assignedListsQuery = `
      SELECT DISTINCT wl.id
      FROM word_lists wl
      JOIN class_word_list_assignments cwla ON wl.id = cwla.list_id
      JOIN class_memberships cm ON cwla.class_id = cm.class_id
      WHERE cm.user_id = $1 ${listId ? 'AND wl.id = $2' : ''}
    `;

    const params = listId ? [userId, listId] : [userId];
    const assignedLists = await query(assignedListsQuery, params);

    if (assignedLists.rows.length === 0) {
      return res.status(404).json({ error: 'No assigned word lists found' });
    }

    const wordsQuery = `
      SELECT DISTINCT w.id, w.base_form, w.definition, w.example_sentence,
             COALESCE(sp.status, 'unseen') as status,
             COALESCE(sp.current_phase, 1) as current_phase,
             COALESCE(sp.next_review, NOW()) as next_review
      FROM words w
      LEFT JOIN student_progress sp ON w.id = sp.word_id AND sp.user_id = $1
      WHERE w.list_id = ANY($2)
        AND w.is_active = TRUE
        AND (sp.status IS NULL OR sp.status != 'mastered' OR sp.next_review <= NOW())
      ORDER BY
        CASE
          WHEN sp.status = 'learning' AND sp.next_review <= NOW() THEN 1
          WHEN sp.status IS NULL THEN 2
          ELSE 3
        END,
        sp.next_review ASC NULLS FIRST,
        RANDOM()
      LIMIT 20
    `;

    const listIds = assignedLists.rows.map(row => row.id);
    const wordsResult = await query(wordsQuery, [userId, listIds]);

    const practiceWords: PracticeWord[] = wordsResult.rows.map(word => ({
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
};

export const submitPracticeResults = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { results, sessionId } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'Invalid results format' });
    }

    for (const result of results as PracticeResult[]) {
      const { wordId, isCorrect, timeSpent } = result;

      const progressResult = await query(
        'SELECT * FROM student_progress WHERE user_id = $1 AND word_id = $2',
        [userId, wordId]
      );

      if (progressResult.rows.length === 0) {
        const nextReview = new Date();
        if (isCorrect) {
          nextReview.setDate(nextReview.getDate() + SPACED_REPETITION_INTERVALS[0]);
        }

        await query(
          `INSERT INTO student_progress
           (user_id, word_id, status, current_phase, times_correct, times_incorrect, last_practiced, next_review)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
          [
            userId,
            wordId,
            isCorrect ? 'learning' : 'learning',
            1,
            isCorrect ? 1 : 0,
            isCorrect ? 0 : 1,
            nextReview
          ]
        );
      } else {
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

        await query(
          `UPDATE student_progress
           SET status = $1, current_phase = $2, times_correct = $3, times_incorrect = $4,
               last_practiced = NOW(), next_review = $5, updated_at = NOW()
           WHERE user_id = $6 AND word_id = $7`,
          [newStatus, newPhase, timesCorrect, timesIncorrect, nextReview, userId, wordId]
        );
      }
    }

    const correctCount = results.filter((r: PracticeResult) => r.isCorrect).length;
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
};

export const getStudentProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

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

    const result = await query(progressQuery, [userId]);

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
};