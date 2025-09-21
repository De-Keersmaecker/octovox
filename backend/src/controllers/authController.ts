import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { User, JWTPayload } from '../types';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, name, password, classCode } = req.body;

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const classResult = await query('SELECT id FROM classes WHERE class_code = $1', [classCode]);
    if (classResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid class code' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();

    const userResult = await query(
      `INSERT INTO users (email, name, password_hash, role, verification_token)
       VALUES ($1, $2, $3, 'student', $4) RETURNING id, email, name, role`,
      [email, name, hashedPassword, verificationToken]
    );

    const user = userResult.rows[0];
    const classId = classResult.rows[0].id;

    await query(
      'INSERT INTO class_memberships (user_id, class_id) VALUES ($1, $2)',
      [user.id, classId]
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role } as JWTPayload,
      process.env.JWT_SECRET!,
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
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const userResult = await query(
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
      { userId: user.id, email: user.email, role: user.role } as JWTPayload,
      process.env.JWT_SECRET!,
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
};

export const teacherLogin = async (req: Request, res: Response) => {
  try {
    const { email, teacherCode } = req.body;

    if (teacherCode !== process.env.TEACHER_CODE) {
      return res.status(401).json({ error: 'Invalid teacher code' });
    }

    const userResult = await query(
      'SELECT id, email, name, role FROM users WHERE email = $1 AND role = $2',
      [email, 'teacher']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Teacher not found' });
    }

    const user = userResult.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role } as JWTPayload,
      process.env.JWT_SECRET!,
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
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const result = await query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};