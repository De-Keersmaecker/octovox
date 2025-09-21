# Octovox - Vocabulary Learning Platform

A minimalist vocabulary learning application built with Next.js, Express.js, and PostgreSQL. Features spaced repetition learning, clean retro aesthetics, and separate interfaces for students and teachers.

## 🏗️ Architecture

This is a monorepo containing:
- **Frontend**: Next.js with Tailwind CSS (retro black/white theme)
- **Backend**: Express.js API with JWT authentication
- **Database**: PostgreSQL with comprehensive schema

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd octovox
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database URL and other settings

   # Frontend
   cp frontend/.env.example frontend/.env.local
   # Edit frontend/.env.local with your API URL
   ```

3. **Initialize database**
   ```bash
   # Create database and run schema
   psql -d your_database < database/schema.sql
   psql -d your_database < database/seed.sql
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 📚 Features

### For Students
- **Clean Dashboard**: Overview of assigned word lists with progress tracking
- **Spaced Repetition**: Intelligent algorithm for optimal learning
- **Immediate Feedback**: Visual and audio feedback for correct/incorrect answers
- **Progress Tracking**: See mastered, learning, and new words

### For Teachers
- **Class Management**: Create and manage classes with unique codes
- **Word List Creation**: Create custom word lists with definitions and examples
- **Student Monitoring**: Track progress across all students and lists
- **Excel Import**: Bulk import word lists from Excel files

## 🔧 Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, TypeScript
- **Backend**: Express.js, TypeScript, JWT authentication
- **Database**: PostgreSQL with UUID primary keys
- **Deployment**: Railway (recommended)

## 🎨 Design Philosophy

- **Minimalist**: Clean, distraction-free interface
- **Retro Aesthetic**: Black and white theme with monospace fonts
- **Mobile-First**: Responsive design for all devices
- **Accessible**: High contrast and clear typography

## 🗄️ Database Schema

Key tables:
- `users` - Students and teachers
- `classes` - Class organization
- `word_lists` - Vocabulary collections
- `words` - Individual vocabulary items
- `student_progress` - Learning progress tracking

## 🚀 Deployment

### Railway Deployment (Recommended)

1. **Backend Service**
   ```bash
   # Deploy backend
   railway login
   railway init
   railway add postgresql
   railway deploy
   ```

2. **Frontend Service**
   ```bash
   # Deploy frontend
   railway init
   railway deploy
   ```

3. **Environment Variables**
   Set these in Railway dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_API_URL`

## 🔐 Authentication

- **Students**: Email/password + class code registration
- **Teachers**: Email + special teacher code
- **JWT Tokens**: 90-day expiration for "stay logged in" functionality

## 🧠 Learning Algorithm

Uses spaced repetition with intervals:
- Day 1: Initial learning
- Day 3: First review
- Day 7: Second review
- Day 14: Third review
- Day 30: Final review → Mastered

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Student registration
- `POST /api/auth/login` - Student login
- `POST /api/auth/teacher-login` - Teacher login

### Learning
- `GET /api/learning/practice/:listId?` - Get practice words
- `POST /api/learning/practice/results` - Submit practice results
- `GET /api/learning/progress` - Get student progress

## 🎯 Core Principles

1. **Focus**: One task at a time, no distractions
2. **Modularity**: Learning organized by word lists
3. **Motivation**: Clear progress and immediate feedback
4. **Simplicity**: Minimal, intuitive interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:
- Create an issue in this repository
- Check the documentation in `/docs`

---

Built with ❤️ for effective vocabulary learning