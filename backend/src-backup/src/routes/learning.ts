import { Router } from 'express';
import { getPracticeWords, submitPracticeResults, getStudentProgress } from '../controllers/learningController';
import { authenticateToken, requireStudent } from '../middleware/auth';
import { validateRequest, practiceResultSchema } from '../middleware/validation';

const router = Router();

router.use(authenticateToken);
router.use(requireStudent);

router.get('/practice/:listId?', getPracticeWords);
router.post('/practice/results', validateRequest(practiceResultSchema), submitPracticeResults);
router.get('/progress', getStudentProgress);

export default router;