// Atomic Database Operations
// Prevents race conditions and ensures data consistency

import { db } from '@/app/lib/firebase';
import { doc, runTransaction, Timestamp, increment } from 'firebase/firestore';
import { UserProgress, SubjectProgress } from '@/app/lib/gamification/userSchema';
import { ProgressCalculationInput, ProgressCalculationResult } from '@/app/lib/gamification/progressCalculator';
import { ProgressCalculator } from '@/app/lib/gamification/progressCalculator';
import { AntiCheatSystem } from '@/app/lib/gamification/antiCheatSystem';

export interface AtomicUpdateResult {
  success: boolean;
  user?: UserProgress;
  events?: Array<{
    type: 'LEVEL_UP' | 'RANK_UP' | 'STREAK_MILESTONE' | 'ACHIEVEMENT';
    data: any;
  }>;
  error?: string;
  retryable?: boolean;
}

export interface ProgressLogEntry {
  userId: string;
  xpEarned: number;
  subjectId?: string;
  activityType: string;
  timestamp: Timestamp;
  metadata: {
    difficulty?: string;
    isCorrect?: boolean;
    timeSpent?: number;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * Atomic Database Operations Manager
 * Ensures data consistency and prevents race conditions
 */
export class AtomicOperationsManager {
  /**
   * Atomically update user progress with anti-cheat validation
   */
  static async updateProgressAtomic(
    userId: string,
    input: ProgressCalculationInput,
    sessionId: string,
    metadata: {
      userAgent?: string;
      ipAddress?: string;
    } = {}
  ): Promise<AtomicUpdateResult> {
    const userRef = doc(db, 'users', userId);
    const progressLogRef = doc(db, 'progressLogs', `${userId}_${Date.now()}`);

    try {
      const result = await runTransaction(db, async (transaction) => {
        // Get current user document
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const currentUser = userDoc.data() as UserProgress;

        // Validate input with anti-cheat system
        const antiCheatValidation = await AntiCheatSystem.validateActivity(
          currentUser,
          input.earnedXP,
          input.activityType,
          {
            ...metadata,
            sessionId,
            timestamp: Date.now()
          }
        );

        if (antiCheatValidation.blocked) {
          throw new Error(`Activity blocked: ${antiCheatValidation.reasons.join(', ')}`);
        }

        // Calculate progress updates
        const progressResult = await ProgressCalculator.calculateProgress({
          ...input,
          user: currentUser
        });

        if (!progressResult.success) {
          throw new Error(`Progress calculation failed: ${progressResult.errors.join(', ')}`);
        }

        // Prepare atomic updates
        const updates: Record<string, any> = {
          'globalStats.xp': increment(input.earnedXP),
          'globalStats.level': progressResult.changes.globalLevel,
          'globalStats.rank': progressResult.changes.newRank,
          'globalStats.lastActive': new Date().toISOString(),
          'globalStats.totalStudyTime': increment(input.timeSpent || 0),
          'globalStats.questionsAnswered': increment(1),
          'globalStats.correctAnswers': increment(input.isCorrect ? 1 : 0),
          'updatedAt': new Date().toISOString(),
          'antiCheat.xpGainedToday': increment(input.earnedXP),
          'antiCheat.xpGainedThisHour': increment(input.earnedXP),
          'antiCheat.questionsAnsweredThisSession': increment(1),
          'antiCheat.lastActivityTimestamp': Date.now()
        };

        // Update subject-specific progress if applicable
        if (input.subjectId && progressResult.subjectProgress) {
          updates[`subjects.${input.subjectId}.xp`] = increment(input.earnedXP);
          updates[`subjects.${input.subjectId}.level`] = progressResult.changes.subjectLevel;
          updates[`subjects.${input.subjectId}.lastActivity`] = new Date().toISOString();
          updates[`subjects.${input.subjectId}.questionsAnswered`] = increment(1);
          updates[`subjects.${input.subjectId}.correctAnswers`] = increment(input.isCorrect ? 1 : 0);
        }

        // Update streak if applicable
        if (progressResult.changes.streakExtended) {
          updates['globalStats.streak'] = increment(1);
          updates['globalStats.longestStreak'] = increment(1);
        }

        // Add achievements and unlocks
        if (progressResult.changes.achievements.length > 0) {
          updates['globalStats.achievements'] = progressResult.changes.achievements;
        }

        if (progressResult.changes.unlocks.length > 0) {
          updates['globalStats.badges'] = progressResult.changes.unlocks;
        }

        // Apply atomic updates
        transaction.update(userRef, updates);

        // Create progress log entry
        const logEntry: ProgressLogEntry = {
          userId,
          xpEarned: input.earnedXP,
          subjectId: input.subjectId,
          activityType: input.activityType,
          timestamp: Timestamp.now(),
          metadata: {
            difficulty: input.difficulty,
            isCorrect: input.isCorrect,
            timeSpent: input.timeSpent,
            sessionId,
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress
          }
        };

        transaction.set(progressLogRef, logEntry);

        // Generate events for notification system
        const events = [];
        
        if (progressResult.events.levelUp.global) {
          events.push({
            type: 'LEVEL_UP' as const,
            data: {
              fromLevel: progressResult.changes.globalLevel - progressResult.events.levelUp.levelsGained.global,
              toLevel: progressResult.changes.globalLevel,
              levelsGained: progressResult.events.levelUp.levelsGained.global
            }
          });
        }

        if (progressResult.events.rankUp) {
          events.push({
            type: 'RANK_UP' as const,
            data: {
              fromRank: progressResult.changes.oldRank,
              toRank: progressResult.changes.newRank
            }
          });
        }

        if (progressResult.events.streakMilestone) {
          events.push({
            type: 'STREAK_MILESTONE' as const,
            data: {
              streak: progressResult.user.globalStats.streak,
              rewards: progressResult.changes.rewards
            }
          });
        }

        return {
          user: progressResult.user,
          events,
          antiCheatWarnings: antiCheatValidation.warnings
        };
      });

      return {
        success: true,
        user: result.user,
        events: result.events
      };

    } catch (error) {
      console.error('Atomic update failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const retryable = errorMessage.includes('transaction') || errorMessage.includes('timeout');

      return {
        success: false,
        error: errorMessage,
        retryable
      };
    }
  }

  /**
   * Atomically reset daily limits
   */
  static async resetDailyLimitsAtomic(userId: string): Promise<AtomicUpdateResult> {
    const userRef = doc(db, 'users', userId);

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const user = userDoc.data() as UserProgress;
        const today = new Date().toISOString().split('T')[0];
        const lastReset = user.antiCheat.lastXPReset.split('T')[0];

        if (lastReset === today) {
          throw new Error('Daily limits already reset today');
        }

        const updates = {
          'antiCheat.xpGainedToday': 0,
          'antiCheat.lastXPReset': new Date().toISOString(),
          'antiCheat.questionsAnsweredThisSession': 0,
          'antiCheat.sessionStartTime': new Date().toISOString()
        };

        transaction.update(userRef, updates);
      });

      return { success: true };

    } catch (error) {
      console.error('Daily limits reset failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: false
      };
    }
  }

  /**
   * Atomically update streak
   */
  static async updateStreakAtomic(
    userId: string,
    subjectId?: string
  ): Promise<AtomicUpdateResult> {
    const userRef = doc(db, 'users', userId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const user = userDoc.data() as UserProgress;
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const lastActive = new Date(user.globalStats.lastActive).toISOString().split('T')[0];

        let newStreak = user.globalStats.streak;
        let streakExtended = false;
        let streakReset = false;

        // Streak logic
        if (today === lastActive) {
          // Same day activity
          return { user, events: [] };
        }

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive === yesterdayStr) {
          // Continue streak
          newStreak++;
          streakExtended = true;
        } else {
          // Reset streak
          newStreak = 1;
          streakReset = true;
        }

        const updates: Record<string, any> = {
          'globalStats.streak': newStreak,
          'globalStats.lastActive': now.toISOString(),
          'updatedAt': now.toISOString()
        };

        if (streakExtended) {
          updates['globalStats.longestStreak'] = Math.max(user.globalStats.longestStreak, newStreak);
        }

        // Update subject streak if applicable
        if (subjectId && user.subjects[subjectId]) {
          updates[`subjects.${subjectId}.streak`] = newStreak;
          updates[`subjects.${subjectId}.lastActivity`] = now.toISOString();
        }

        transaction.update(userRef, updates);

        // Generate events
        const events = [];
        
        if (streakExtended) {
          // Check for milestones
          const milestones = [3, 7, 14, 30, 60, 100];
          if (milestones.includes(newStreak)) {
            events.push({
              type: 'STREAK_MILESTONE' as const,
              data: { streak: newStreak }
            });
          }
        }

        return {
          user: { ...user, globalStats: { ...user.globalStats, streak: newStreak } },
          events
        };
      });

      return {
        success: true,
        user: result.user,
        events: result.events
      };

    } catch (error) {
      console.error('Streak update failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      };
    }
  }

  /**
   * Atomically bulk update multiple users (for admin operations)
   */
  static async bulkUpdateUsersAtomic(
    userIds: string[],
    updates: Record<string, any>
  ): Promise<AtomicUpdateResult> {
    const results = [];

    for (const userId of userIds) {
      const userRef = doc(db, 'users', userId);
      
      try {
        await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          
          if (!userDoc.exists()) {
            throw new Error(`User ${userId} not found`);
          }

          transaction.update(userRef, updates);
        });

        results.push({ userId, success: true });
      } catch (error) {
        results.push({ 
          userId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const failedCount = results.filter(r => !r.success).length;
    
    return {
      success: failedCount === 0,
      error: failedCount > 0 ? `${failedCount} users failed to update` : undefined,
      retryable: false
    };
  }

  /**
   * Atomically create user profile
   */
  static async createUserAtomic(
    userId: string,
    email: string,
    displayName: string
  ): Promise<AtomicUpdateResult> {
    const userRef = doc(db, 'users', userId);

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists()) {
          throw new Error('User already exists');
        }

        // Import the user schema creation function
        const { UserSchemaUtils } = await import('@/app/lib/gamification/userSchema');
        const newUser = UserSchemaUtils.createNewUser(userId, email, displayName);

        transaction.set(userRef, newUser);
      });

      return { success: true };

    } catch (error) {
      console.error('User creation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: false
      };
    }
  }

  /**
   * Get user progress with caching fallback
   */
  static async getUserProgress(userId: string): Promise<UserProgress | null> {
    const userRef = doc(db, 'users', userId);

    try {
      const userDoc = await runTransaction(db, async (transaction) => {
        const doc = await transaction.get(userRef);
        return doc;
      });

      if (!userDoc.exists()) {
        return null;
      }

      return userDoc.data() as UserProgress;

    } catch (error) {
      console.error('Failed to get user progress:', error);
      return null;
    }
  }

  /**
   * Validate user can perform action (rate limiting)
   */
  static async validateUserAction(
    userId: string,
    actionType: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const userRef = doc(db, 'users', userId);
    const rateLimitRef = doc(db, 'rateLimits', `${userId}_${actionType}`);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const rateLimitDoc = await transaction.get(rateLimitRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const now = new Date();
        const windowStart = new Date(now.getTime() - windowSeconds * 1000);

        let currentCount = 0;
        let resetTime = now;

        if (rateLimitDoc.exists()) {
          const rateLimitData = rateLimitDoc.data();
          const lastReset = rateLimitData.lastReset?.toDate() || now;
          
          if (lastReset < windowStart) {
            // Reset window
            currentCount = 1;
            resetTime = new Date(lastReset.getTime() + windowSeconds * 1000);
          } else {
            currentCount = rateLimitData.count || 0;
            resetTime = new Date(lastReset.getTime() + windowSeconds * 1000);
          }
        } else {
          currentCount = 1;
          resetTime = new Date(now.getTime() + windowSeconds * 1000);
        }

        const allowed = currentCount <= limit;
        const remaining = Math.max(0, limit - currentCount);

        if (allowed) {
          // Update rate limit
          transaction.set(rateLimitRef, {
            count: currentCount + 1,
            lastReset: Timestamp.now(),
            windowSeconds
          });
        }

        return { allowed, remaining, resetTime };
      });

      return result;

    } catch (error) {
      console.error('Rate limit validation failed:', error);
      
      // Fail open - allow action if rate limiting fails
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: new Date(Date.now() + windowSeconds * 1000)
      };
    }
  }
}

export default AtomicOperationsManager;
