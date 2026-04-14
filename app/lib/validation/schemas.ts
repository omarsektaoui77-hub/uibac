// Zod Validation Schemas
// Comprehensive input validation for all API endpoints

import { z } from 'zod';

// Common validation patterns
export const positiveNumber = z.number().positive().max(10000);
export const nonNegativeNumber = z.number().nonnegative().max(100000);
export const subjectId = z.string().min(1).max(50);
export const activityType = z.enum(['question', 'quiz', 'challenge', 'bonus']);
export const difficulty = z.enum(['easy', 'medium', 'hard']);
export const boolean = z.boolean();

// Progress Update Schema
export const ProgressUpdateSchema = z.object({
  earnedXP: positiveNumber,
  subjectId: subjectId.optional(),
  activityType: activityType,
  difficulty: difficulty.optional(),
  isCorrect: boolean.default(true),
  timeSpent: nonNegativeNumber.optional(),
  sessionId: z.string().min(1).max(100),
  metadata: z.object({
    userAgent: z.string().optional(),
    questionId: z.string().optional(),
    topicId: z.string().optional(),
    source: z.enum(['web', 'mobile', 'api']).default('web')
  }).optional()
});

// User Profile Schema
export const UserProfileSchema = z.object({
  displayName: z.string().min(1).max(50),
  preferences: z.object({
    notifications: boolean.default(true),
    soundEffects: boolean.default(true),
    animations: boolean.default(true),
    language: z.enum(['ar', 'en', 'fr', 'es']).default('ar'),
    theme: z.enum(['light', 'dark']).default('light')
  }).optional()
});

// Bulk Progress Update Schema
export const BulkProgressUpdateSchema = z.object({
  activities: z.array(ProgressUpdateSchema).min(1).max(10),
  sessionId: z.string().min(1).max(100)
});

// Analytics Query Schema
export const AnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  subjectId: subjectId.optional(),
  activityType: activityType.optional(),
  limit: z.number().positive().max(1000).default(100),
  offset: z.number().nonnegative().max(10000).default(0),
  includeInsights: z.boolean().default(false)
});

// Leaderboard Query Schema
export const LeaderboardQuerySchema = z.object({
  type: z.enum(['xp', 'level', 'streak', 'accuracy']).default('xp'),
  subjectId: subjectId.optional(),
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('all_time'),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().nonnegative().max(1000).default(0)
});

// Achievement Unlock Schema
export const AchievementUnlockSchema = z.object({
  achievementId: z.string().min(1).max(50),
  metadata: z.object({
    unlockedAt: z.string().datetime(),
    context: z.string().optional()
  }).optional()
});

// User Search Schema
export const UserSearchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  subjectId: subjectId.optional(),
  minLevel: z.number().positive().max(100).optional(),
  maxLevel: z.number().positive().max(100).optional(),
  rank: z.string().optional(),
  limit: z.number().positive().max(50).default(20)
});

// Streak Action Schema
export const StreakActionSchema = z.object({
  action: z.enum(['check', 'extend', 'freeze']),
  subjectId: subjectId.optional(),
  metadata: z.object({
    timezone: z.string().optional(),
    clientTime: z.string().datetime().optional()
  }).optional()
});

// Admin Action Schema
export const AdminActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['reset_xp', 'reset_streak', 'ban', 'unban', 'add_xp', 'remove_xp']),
  reason: z.string().min(1).max(500),
  amount: positiveNumber.optional(),
  metadata: z.record(z.any(), z.any()).optional()
});

// Report Generation Schema
export const ReportGenerationSchema = z.object({
  type: z.enum(['progress', 'analytics', 'performance', 'engagement']),
  userId: z.string().min(1).optional(),
  subjectId: subjectId.optional(),
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  includeDetails: boolean.default(false)
});

// Notification Schema
export const NotificationSchema = z.object({
  type: z.enum(['level_up', 'rank_up', 'streak_milestone', 'achievement', 'reminder']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  userId: z.string().min(1).optional(),
  subjectId: subjectId.optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  scheduledAt: z.string().datetime().optional(),
  metadata: z.record(z.any(), z.any()).optional()
});

// Batch User Creation Schema
export const BatchUserCreationSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    displayName: z.string().min(1).max(50),
    initialXP: nonNegativeNumber.default(0),
    level: positiveNumber.optional(),
    subscriptionTier: z.enum(['free', 'basic', 'premium']).default('free')
  })).min(1).max(100)
});

// Export all schemas for easy importing
export const ValidationSchemas = {
  ProgressUpdate: ProgressUpdateSchema,
  UserProfile: UserProfileSchema,
  BulkProgressUpdate: BulkProgressUpdateSchema,
  AnalyticsQuery: AnalyticsQuerySchema,
  LeaderboardQuery: LeaderboardQuerySchema,
  AchievementUnlock: AchievementUnlockSchema,
  UserSearch: UserSearchSchema,
  StreakAction: StreakActionSchema,
  AdminAction: AdminActionSchema,
  ReportGeneration: ReportGenerationSchema,
  Notification: NotificationSchema,
  BatchUserCreation: BatchUserCreationSchema
};

// Type exports for TypeScript
export type ProgressUpdateInput = z.infer<typeof ProgressUpdateSchema>;
export type UserProfileInput = z.infer<typeof UserProfileSchema>;
export type BulkProgressUpdateInput = z.infer<typeof BulkProgressUpdateSchema>;
export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;
export type LeaderboardQueryInput = z.infer<typeof LeaderboardQuerySchema>;
export type AchievementUnlockInput = z.infer<typeof AchievementUnlockSchema>;
export type UserSearchInput = z.infer<typeof UserSearchSchema>;
export type StreakActionInput = z.infer<typeof StreakActionSchema>;
export type AdminActionInput = z.infer<typeof AdminActionSchema>;
export type ReportGenerationInput = z.infer<typeof ReportGenerationSchema>;
export type NotificationInput = z.infer<typeof NotificationSchema>;
export type BatchUserCreationInput = z.infer<typeof BatchUserCreationSchema>;

export default ValidationSchemas;
