export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  id: string;
  name: string;
  classCode: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordList {
  id: string;
  title: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Word {
  id: string;
  listId: string;
  baseForm: string;
  definition: string;
  exampleSentence?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProgress {
  id: string;
  userId: string;
  wordId: string;
  status: 'unseen' | 'learning' | 'mastered';
  currentPhase: number;
  timesIncorrect: number;
  timesCorrect: number;
  lastPracticed?: Date;
  nextReview?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningSession {
  id: string;
  userId: string;
  listId: string;
  wordsPracticed: number;
  wordsCorrect: number;
  sessionDuration?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'student' | 'teacher';
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface PracticeWord {
  id: string;
  baseForm: string;
  definition: string;
  exampleSentence?: string;
  options?: string[];
  correctAnswer?: string;
}

export interface PracticeResult {
  wordId: string;
  isCorrect: boolean;
  timeSpent: number;
}