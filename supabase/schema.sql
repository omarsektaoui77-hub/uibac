-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_points INTEGER DEFAULT 0,
  rank_points INTEGER DEFAULT 0,
  current_rank TEXT DEFAULT 'Novice',
  streak_days INTEGER DEFAULT 0
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  icon TEXT,
  color TEXT
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  difficulty TEXT DEFAULT 'medium'
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_ar TEXT,
  question_fr TEXT,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_daily_challenge BOOLEAN DEFAULT FALSE
);

-- Topic performance table (for weak topic detection)
CREATE TABLE IF NOT EXISTS topic_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  total_attempts INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  avg_time_seconds DECIMAL(10, 2),
  last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Rankings table (weekly leaderboard)
CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  rank_points INTEGER DEFAULT 0,
  weekly_position INTEGER,
  UNIQUE(user_id, week_start_date)
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_date DATE UNIQUE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  question_ids JSONB NOT NULL,
  bonus_points INTEGER DEFAULT 50,
  completed_by UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject ON quiz_attempts(subject_id);
CREATE INDEX IF NOT EXISTS idx_topic_performance_user ON topic_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_performance_topic ON topic_performance(topic_id);
CREATE INDEX IF NOT EXISTS idx_rankings_week ON rankings(week_start_date);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);

-- Insert initial subjects
INSERT INTO subjects (name, name_ar, name_fr, icon, color) VALUES
  ('Mathematics', 'الرياضيات', 'Mathématiques', '📐', '#3B82F6'),
  ('Physics', 'الفيزياء', 'Physique', '⚡', '#10B981'),
  ('Arabic', 'اللغة العربية', 'Arabe', '📚', '#F59E0B'),
  ('French', 'اللغة الفرنسية', 'Français', '🇫🇷', '#8B5CF6'),
  ('English', 'اللغة الإنجليزية', 'Anglais', '🇬🇧', '#EC4899')
ON CONFLICT (name) DO NOTHING;
