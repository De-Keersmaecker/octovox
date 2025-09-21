import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(6).required(),
  classCode: Joi.string().length(8).required(),
  role: Joi.string().valid('student').default('student')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const teacherLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  teacherCode: Joi.string().required()
});

export const createClassSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
});

export const createWordListSchema = Joi.object({
  title: Joi.string().min(2).max(255).required()
});

export const createWordSchema = Joi.object({
  baseForm: Joi.string().min(1).max(255).required(),
  definition: Joi.string().min(1).required(),
  exampleSentence: Joi.string().max(500).optional(),
  isActive: Joi.boolean().default(true)
});

export const updateWordSchema = Joi.object({
  baseForm: Joi.string().min(1).max(255).optional(),
  definition: Joi.string().min(1).optional(),
  exampleSentence: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional()
});

export const practiceResultSchema = Joi.object({
  wordId: Joi.string().uuid().required(),
  isCorrect: Joi.boolean().required(),
  timeSpent: Joi.number().min(0).required()
});