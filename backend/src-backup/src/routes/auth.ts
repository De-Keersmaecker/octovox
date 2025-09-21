import { Router } from 'express';
import { register, login, teacherLogin, verifyEmail } from '../controllers/authController';
import { validateRequest, registerSchema, loginSchema, teacherLoginSchema } from '../middleware/validation';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/teacher-login', validateRequest(teacherLoginSchema), teacherLogin);
router.get('/verify/:token', verifyEmail);

export default router;