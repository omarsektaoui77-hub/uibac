// Scalable User Schema for Gamified Progress System
// Designed for Firebase/MongoDB with extensible subject system

export interface SubjectProgress {
  xp: number;
  level: number;
  lastActivity: string; // ISO date string
  questionsAnswered: number;
  correctAnswers: number;
  averageAccuracy: number;
  streak: number; // Subject-specific streak
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

export interface GlobalStats {
  xp: number;
  level: number;
  rank: string;
  streak: number;
  lastActive: string; // ISO date string
  totalStudyTime: number; // minutes
  questionsAnswered: number;
  correctAnswers: number;
  averageAccuracy: number;
  achievements: string[]; // Achievement IDs
  badges: string[]; // Badge IDs
  totalLevelUps: number;
  longestStreak: number;
}

export interface AntiCheatMetrics {
  xpGainedToday: number;
  xpGainedThisHour: number;
  lastXPReset: string; // ISO date string for daily reset
  sessionStartTime: string;
  questionsAnsweredThisSession: number;
  suspiciousActivityCount: number;
  lastActivityTimestamp: number; // Unix timestamp
}

export interface UserProgress {
  userId: string;
  email: string;
  displayName: string;
  avatar?: string;
  preferences: {
    notifications: boolean;
    soundEffects: boolean;
    animations: boolean;
    language: 'ar' | 'en' | 'fr' | 'es';
    theme: 'light' | 'dark';
  };
  globalStats: GlobalStats;
  subjects: Record<string, SubjectProgress>; // Dynamic subject system
  antiCheat: AntiCheatMetrics;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  isPremium: boolean;
  subscriptionTier: 'free' | 'basic' | 'premium';
}

// Subject configuration for extensibility
export interface SubjectConfig {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
  category: 'sciences' | 'mathematics' | 'languages' | 'humanities';
  difficulty: 'easy' | 'medium' | 'hard';
  isCore: boolean; // Core subjects for Baccalaureate
  prerequisites?: string[]; // Subject IDs required
  relatedSubjects?: string[]; // Related subject IDs
}

// Predefined subjects for Moroccan Baccalaureate
export const BACCALAUREATE_SUBJECTS: Record<string, SubjectConfig> = {
  // Sciences
  physics: {
    id: 'physics',
    name: 'physics',
    displayName: 'Physics',
    icon: 'physics',
    color: '#FF6B6B',
    description: 'Study of matter, energy, and their interactions',
    category: 'sciences',
    difficulty: 'medium',
    isCore: true,
    relatedSubjects: ['chemistry', 'mathematics']
  },
  chemistry: {
    id: 'chemistry',
    name: 'chemistry',
    displayName: 'Chemistry',
    icon: 'chemistry',
    color: '#4ECDC4',
    description: 'Study of matter and its properties',
    category: 'sciences',
    difficulty: 'medium',
    isCore: true,
    relatedSubjects: ['physics', 'biology']
  },
  biology: {
    id: 'biology',
    name: 'biology',
    displayName: 'Biology',
    icon: 'biology',
    color: '#95E77E',
    description: 'Study of living organisms',
    category: 'sciences',
    difficulty: 'medium',
    isCore: true,
    relatedSubjects: ['chemistry']
  },

  // Mathematics
  mathematics: {
    id: 'mathematics',
    name: 'mathematics',
    displayName: 'Mathematics',
    icon: 'math',
    color: '#FFE66D',
    description: 'Study of numbers, quantities, and shapes',
    category: 'mathematics',
    difficulty: 'hard',
    isCore: true,
    relatedSubjects: ['physics', 'chemistry']
  },
  advanced_math: {
    id: 'advanced_math',
    name: 'advanced_math',
    displayName: 'Advanced Mathematics',
    icon: 'math',
    color: '#FF9F1C',
    description: 'Advanced mathematical concepts and calculus',
    category: 'mathematics',
    difficulty: 'hard',
    isCore: true,
    prerequisites: ['mathematics'],
    relatedSubjects: ['physics']
  },

  // Languages
  arabic: {
    id: 'arabic',
    name: 'arabic',
    displayName: 'Arabic',
    icon: 'language',
    color: '#A8DADC',
    description: 'Arabic language and literature',
    category: 'languages',
    difficulty: 'medium',
    isCore: true
  },
  french: {
    id: 'french',
    name: 'french',
    displayName: 'French',
    icon: 'language',
    color: '#457B9D',
    description: 'French language and literature',
    category: 'languages',
    difficulty: 'medium',
    isCore: true
  },
  english: {
    id: 'english',
    name: 'english',
    displayName: 'English',
    icon: 'language',
    color: '#1D3557',
    description: 'English language and literature',
    category: 'languages',
    difficulty: 'easy',
    isCore: false
  },

  // Humanities
  philosophy: {
    id: 'philosophy',
    name: 'philosophy',
    displayName: 'Philosophy',
    icon: 'psychology',
    color: '#F1FAEE',
    description: 'Study of fundamental questions about existence',
    category: 'humanities',
    difficulty: 'hard',
    isCore: true
  },
  history: {
    id: 'history',
    name: 'history',
    displayName: 'History',
    icon: 'history',
    color: '#E63946',
    description: 'Study of past events and civilizations',
    category: 'humanities',
    difficulty: 'medium',
    isCore: true
  },
  geography: {
    id: 'geography',
    name: 'geography',
    displayName: 'Geography',
    icon: 'public',
    color: '#2A9D8F',
    description: 'Study of Earth\'s physical features',
    category: 'humanities',
    difficulty: 'medium',
    isCore: true
  },

  // Islamic Studies
  islamic_studies: {
    id: 'islamic_studies',
    name: 'islamic_studies',
    displayName: 'Islamic Studies',
    icon: 'mosque',
    color: '#264653',
    description: 'Study of Islamic principles and history',
    category: 'humanities',
    difficulty: 'medium',
    isCore: true
  }
};

// Utility functions for schema management
export class UserSchemaUtils {
  /**
   * Create a new user progress document
   */
  static createNewUser(userId: string, email: string, displayName: string): UserProgress {
    const now = new Date().toISOString();
    
    // Initialize all subjects with default progress
    const subjects: Record<string, SubjectProgress> = {};
    
    Object.values(BACCALAUREATE_SUBJECTS).forEach(subject => {
      subjects[subject.id] = {
        xp: 0,
        level: 1,
        lastActivity: now,
        questionsAnswered: 0,
        correctAnswers: 0,
        averageAccuracy: 0,
        streak: 0,
        masteryLevel: 'beginner'
      };
    });

    return {
      userId,
      email,
      displayName,
      preferences: {
        notifications: true,
        soundEffects: true,
        animations: true,
        language: 'ar',
        theme: 'light'
      },
      globalStats: {
        xp: 0,
        level: 1,
        rank: 'Beginner',
        streak: 0,
        lastActive: now,
        totalStudyTime: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        averageAccuracy: 0,
        achievements: [],
        badges: [],
        totalLevelUps: 0,
        longestStreak: 0
      },
      subjects,
      antiCheat: {
        xpGainedToday: 0,
        xpGainedThisHour: 0,
        lastXPReset: now,
        sessionStartTime: now,
        questionsAnsweredThisSession: 0,
        suspiciousActivityCount: 0,
        lastActivityTimestamp: Date.now()
      },
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isPremium: false,
      subscriptionTier: 'free'
    };
  }

  /**
   * Add a new subject to existing user
   */
  static addSubjectToUser(user: UserProgress, subjectId: string): UserProgress {
    if (user.subjects[subjectId]) {
      return user; // Subject already exists
    }

    const now = new Date().toISOString();
    const newSubject: SubjectProgress = {
      xp: 0,
      level: 1,
      lastActivity: now,
      questionsAnswered: 0,
      correctAnswers: 0,
      averageAccuracy: 0,
      streak: 0,
      masteryLevel: 'beginner'
    };

    return {
      ...user,
      subjects: {
        ...user.subjects,
        [subjectId]: newSubject
      },
      updatedAt: now
    };
  }

  /**
   * Get user's core subjects
   */
  static getCoreSubjects(user: UserProgress): SubjectProgress[] {
    return Object.entries(user.subjects)
      .filter(([subjectId]) => BACCALAUREATE_SUBJECTS[subjectId]?.isCore)
      .map(([, progress]) => progress);
  }

  /**
   * Get user's subject by category
   */
  static getSubjectsByCategory(user: UserProgress, category: SubjectConfig['category']): SubjectProgress[] {
    return Object.entries(user.subjects)
      .filter(([subjectId]) => BACCALAUREATE_SUBJECTS[subjectId]?.category === category)
      .map(([, progress]) => progress);
  }

  /**
   * Validate user schema integrity
   */
  static validateUserSchema(user: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.userId) errors.push('Missing userId');
    if (!user.email) errors.push('Missing email');
    if (!user.globalStats) errors.push('Missing globalStats');
    if (!user.subjects || typeof user.subjects !== 'object') errors.push('Invalid subjects object');
    if (!user.antiCheat) errors.push('Missing antiCheat metrics');

    // Validate global stats
    if (user.globalStats) {
      if (typeof user.globalStats.xp !== 'number') errors.push('Invalid globalStats.xp');
      if (typeof user.globalStats.level !== 'number') errors.push('Invalid globalStats.level');
      if (!user.globalStats.rank) errors.push('Missing globalStats.rank');
    }

    // Validate subjects
    if (user.subjects) {
      Object.entries(user.subjects).forEach(([subjectId, progress]: [string, any]) => {
        if (!progress || typeof progress !== 'object') {
          errors.push(`Invalid progress for subject ${subjectId}`);
        } else {
          if (typeof progress.xp !== 'number') errors.push(`Invalid xp for subject ${subjectId}`);
          if (typeof progress.level !== 'number') errors.push(`Invalid level for subject ${subjectId}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get schema version for migrations
   */
  static getSchemaVersion(): string {
    return '1.0.0';
  }

  /**
   * Migrate user schema to latest version
   */
  static migrateUserSchema(user: any, fromVersion: string, toVersion: string): UserProgress {
    // Add migration logic here when schema changes
    // For now, just return the user as-is
    return user as UserProgress;
  }
}

export default UserSchemaUtils;
