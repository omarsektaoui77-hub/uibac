// Core Progress Calculation System
// Handles XP calculation, level-ups, and progress tracking

import { UserProgress, SubjectProgress } from './userSchema';
import { XPSystem, XPResult } from './xpSystem';
import { StreakSystem } from './streakSystem';
import { AntiCheatSystem } from './antiCheatSystem';

export interface ProgressCalculationInput {
  user: UserProgress;
  earnedXP: number;
  subjectId?: string;
  activityType: 'question' | 'quiz' | 'challenge' | 'bonus';
  difficulty?: 'easy' | 'medium' | 'hard';
  isCorrect?: boolean;
  timeSpent?: number; // in seconds
  streakCount?: number;
}

export interface ProgressCalculationResult {
  success: boolean;
  user: UserProgress; // Updated user (no direct DB mutation)
  globalProgress: XPResult;
  subjectProgress?: XPResult;
  changes: {
    globalXP: number;
    subjectXP?: number;
    globalLevel: number;
    subjectLevel?: number;
    rankChanged: boolean;
    oldRank: string;
    newRank: string;
    streakExtended: boolean;
    achievements: string[];
    unlocks: string[];
  };
  events: {
    levelUp: {
      global: boolean;
      subject?: boolean;
      levelsGained: {
        global: number;
        subject?: number;
      };
    };
    rankUp: boolean;
    streakMilestone: boolean;
    newAchievements: string[];
  };
  warnings: string[];
  errors: string[];
  metadata: {
    processingTime: number;
    antiCheatFlags: string[];
    xpBreakdown: {
      baseXP: number;
      difficultyBonus: number;
      streakBonus: number;
      timeBonus: number;
      totalXP: number;
    };
  };
}

/**
 * Core progress calculation system with comprehensive tracking
 */
export class ProgressCalculator {
  /**
   * Main progress calculation function
   * Returns updated user data without direct database mutation
   */
  static async calculateProgress(input: ProgressCalculationInput): Promise<ProgressCalculationResult> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validateInput(input);
      if (!validation.isValid) {
        return this.createErrorResult(input.user, validation.errors, startTime);
      }

      // Anti-cheat validation
      const antiCheatResult = await AntiCheatSystem.validateActivity(input.user, input.earnedXP);
      if (antiCheatResult.blocked) {
        return this.createErrorResult(
          input.user, 
          ['Activity blocked by anti-cheat system'], 
          startTime,
          antiCheatResult.reasons
        );
      }

      // Calculate XP breakdown
      const xpBreakdown = this.calculateXPBreakdown(input);
      
      // Update global progress
      const globalProgress = this.updateGlobalProgress(input.user, xpBreakdown.totalXP);
      
      // Update subject progress if specified
      let subjectProgress: XPResult | undefined;
      if (input.subjectId && input.user.subjects[input.subjectId]) {
        subjectProgress = this.updateSubjectProgress(input.user, input.subjectId, xpBreakdown.totalXP);
      }

      // Update streak
      const streakResult = await StreakSystem.updateStreak(input.user, input.subjectId);
      
      // Calculate changes and events
      const changes = this.calculateChanges(input.user, globalProgress, subjectProgress, streakResult);
      const events = this.calculateEvents(changes, streakResult);

      // Update user object
      const updatedUser = this.updateUserObject(input.user, globalProgress, subjectProgress, streakResult, changes);

      // Calculate achievements and unlocks
      const achievements = this.calculateAchievements(updatedUser, events);
      const unlocks = this.calculateUnlocks(updatedUser, events);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        user: updatedUser,
        globalProgress,
        subjectProgress,
        changes: {
          ...changes,
          achievements,
          unlocks
        },
        events,
        warnings: antiCheatResult.warnings,
        errors: [],
        metadata: {
          processingTime,
          antiCheatFlags: antiCheatResult.flags,
          xpBreakdown
        }
      };

    } catch (error) {
      console.error('Progress calculation failed:', error);
      return this.createErrorResult(
        input.user, 
        [`Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`], 
        startTime
      );
    }
  }

  /**
   * Validate input parameters
   */
  private static validateInput(input: ProgressCalculationInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.user) {
      errors.push('User object is required');
    }

    if (typeof input.earnedXP !== 'number' || input.earnedXP < 0) {
      errors.push('earnedXP must be a non-negative number');
    }

    if (input.subjectId && !input.user.subjects[input.subjectId]) {
      errors.push(`Subject ${input.subjectId} not found in user progress`);
    }

    if (input.difficulty && !['easy', 'medium', 'hard'].includes(input.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    if (input.activityType && !['question', 'quiz', 'challenge', 'bonus'].includes(input.activityType)) {
      errors.push('Invalid activity type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate XP breakdown for transparency
   */
  private static calculateXPBreakdown(input: ProgressCalculationInput): {
    baseXP: number;
    difficultyBonus: number;
    streakBonus: number;
    timeBonus: number;
    totalXP: number;
  } {
    const baseXP = input.earnedXP;
    
    // Difficulty bonus
    const difficultyMultiplier = input.difficulty 
      ? XPSystem.calculateXPEarned(baseXP, input.difficulty, input.isCorrect ?? true) / baseXP
      : 1;
    const difficultyBonus = baseXP * (difficultyMultiplier - 1);

    // Streak bonus
    const streakMultiplier = input.streakCount && input.streakCount > 1 
      ? Math.min(1 + (input.streakCount - 1) * 0.1, 2) // Max 2x bonus
      : 1;
    const streakBonus = baseXP * (streakMultiplier - 1);

    // Time bonus (for quick correct answers)
    let timeBonus = 0;
    if (input.isCorrect && input.timeSpent && input.timeSpent < 30) {
      timeBonus = baseXP * 0.2; // 20% bonus for quick answers
    }

    const totalXP = Math.floor(baseXP + difficultyBonus + streakBonus + timeBonus);

    return {
      baseXP,
      difficultyBonus: Math.floor(difficultyBonus),
      streakBonus: Math.floor(streakBonus),
      timeBonus: Math.floor(timeBonus),
      totalXP
    };
  }

  /**
   * Update global progress
   */
  private static updateGlobalProgress(user: UserProgress, earnedXP: number): XPResult {
    const newXP = user.globalStats.xp + earnedXP;
    return XPSystem.calculateProgressWithLevelUp(user.globalStats.xp, earnedXP);
  }

  /**
   * Update subject progress
   */
  private static updateSubjectProgress(user: UserProgress, subjectId: string, earnedXP: number): XPResult {
    const subject = user.subjects[subjectId];
    const newXP = subject.xp + earnedXP;
    return XPSystem.calculateProgressWithLevelUp(subject.xp, earnedXP);
  }

  /**
   * Calculate all changes
   */
  private static calculateChanges(
    user: UserProgress, 
    globalProgress: XPResult, 
    subjectProgress: XPResult | undefined,
    streakResult: any
  ): ProgressCalculationResult['changes'] {
    const oldRank = user.globalStats.rank;
    const newRank = XPSystem.getRankForLevel(globalProgress.level)?.name || oldRank;
    const rankChanged = oldRank !== newRank;

    return {
      globalXP: globalProgress.currentXP,
      subjectXP: subjectProgress?.currentXP,
      globalLevel: globalProgress.level,
      subjectLevel: subjectProgress?.level,
      rankChanged,
      oldRank,
      newRank,
      streakExtended: streakResult.extended,
      achievements: [],
      unlocks: []
    };
  }

  /**
   * Calculate events
   */
  private static calculateEvents(
    changes: ProgressCalculationResult['changes'], 
    streakResult: any
  ): ProgressCalculationResult['events'] {
    return {
      levelUp: {
        global: changes.globalLevel > 1, // Will be updated with actual comparison
        subject: changes.subjectLevel ? changes.subjectLevel > 1 : false,
        levelsGained: {
          global: 0, // Will be calculated
          subject: changes.subjectLevel ? 0 : undefined
        }
      },
      rankUp: changes.rankChanged,
      streakMilestone: streakResult.milestone,
      newAchievements: []
    };
  }

  /**
   * Update user object with all changes
   */
  private static updateUserObject(
    user: UserProgress,
    globalProgress: XPResult,
    subjectProgress: XPResult | undefined,
    streakResult: any,
    changes: ProgressCalculationResult['changes']
  ): UserProgress {
    const now = new Date().toISOString();
    
    const updatedUser: UserProgress = {
      ...user,
      globalStats: {
        ...user.globalStats,
        xp: globalProgress.currentXP,
        level: globalProgress.level,
        rank: changes.newRank,
        lastActive: now,
        totalLevelUps: user.globalStats.totalLevelUps + (globalProgress.levelsGained || 0),
        longestStreak: Math.max(user.globalStats.longestStreak, streakResult.currentStreak)
      },
      updatedAt: now
    };

    // Update subject progress if specified
    if (subjectProgress && changes.subjectLevel !== undefined) {
      updatedUser.subjects = {
        ...user.subjects,
        [streakResult.subjectId]: {
          ...user.subjects[streakResult.subjectId],
          xp: subjectProgress.currentXP,
          level: subjectProgress.level,
          lastActivity: now,
          streak: streakResult.currentStreak
        }
      };
    }

    // Update anti-cheat metrics
    updatedUser.antiCheat = {
      ...user.antiCheat,
      xpGainedToday: user.antiCheat.xpGainedToday + globalProgress.currentXP - user.globalStats.xp,
      xpGainedThisHour: user.antiCheat.xpGainedThisHour + globalProgress.currentXP - user.globalStats.xp,
      lastActivityTimestamp: Date.now()
    };

    return updatedUser;
  }

  /**
   * Calculate achievements based on progress
   */
  private static calculateAchievements(user: UserProgress, events: ProgressCalculationResult['events']): string[] {
    const achievements: string[] = [];

    // Level-up achievements
    if (events.levelUp.global) {
      if (user.globalStats.level === 5) achievements.push('First Steps');
      if (user.globalStats.level === 10) achievements.push('Rising Star');
      if (user.globalStats.level === 25) achievements.push('Knowledge Master');
      if (user.globalStats.level === 50) achievements.push('Elite Status');
    }

    // Streak achievements
    if (events.streakMilestone) {
      if (user.globalStats.streak === 7) achievements.push('Week Warrior');
      if (user.globalStats.streak === 30) achievements.push('Monthly Champion');
      if (user.globalStats.streak === 100) achievements.push('Century Streak');
    }

    // Rank achievements
    if (events.rankUp) {
      const rank = XPSystem.getRankForLevel(user.globalStats.level);
      if (rank) achievements.push(`${rank.name} Rank`);
    }

    return achievements;
  }

  /**
   * Calculate unlocks based on progress
   */
  private static calculateUnlocks(user: UserProgress, events: ProgressCalculationResult['events']): string[] {
    const unlocks: string[] = [];

    // Level-based unlocks
    if (user.globalStats.level >= 5) unlocks.push('Advanced Topics');
    if (user.globalStats.level >= 10) unlocks.push('Weekly Challenges');
    if (user.globalStats.level >= 25) unlocks.push('Expert Mode');
    if (user.globalStats.level >= 50) unlocks.push('Mentorship Program');

    // Streak-based unlocks
    if (user.globalStats.streak >= 7) unlocks.push('Streak Bonuses');
    if (user.globalStats.streak >= 30) unlocks.push('Premium Rewards');

    return unlocks;
  }

  /**
   * Create error result
   */
  private static createErrorResult(
    user: UserProgress, 
    errors: string[], 
    startTime: number,
    antiCheatFlags: string[] = []
  ): ProgressCalculationResult {
    return {
      success: false,
      user,
      globalProgress: XPSystem.calculateXPResult(user.globalStats.xp),
      changes: {
        globalXP: 0,
        globalLevel: user.globalStats.level,
        rankChanged: false,
        oldRank: user.globalStats.rank,
        newRank: user.globalStats.rank,
        streakExtended: false,
        achievements: [],
        unlocks: []
      },
      events: {
        levelUp: { global: false, levelsGained: { global: 0 } },
        rankUp: false,
        streakMilestone: false,
        newAchievements: []
      },
      warnings: [],
      errors,
      metadata: {
        processingTime: Date.now() - startTime,
        antiCheatFlags,
        xpBreakdown: {
          baseXP: 0,
          difficultyBonus: 0,
          streakBonus: 0,
          timeBonus: 0,
          totalXP: 0
        }
      }
    };
  }

  /**
   * Quick progress calculation (for real-time updates)
   */
  static calculateQuickProgress(user: UserProgress, earnedXP: number): {
    newXP: number;
    newLevel: number;
    levelUp: boolean;
    xpToNext: number;
    progress: number;
  } {
    const result = XPSystem.calculateProgressWithLevelUp(user.globalStats.xp, earnedXP);
    
    return {
      newXP: result.currentXP,
      newLevel: result.level,
      levelUp: result.hasLeveledUp,
      xpToNext: result.xpRemaining,
      progress: result.progressPercentage
    };
  }

  /**
   * Batch progress calculation for multiple activities
   */
  static async calculateBatchProgress(
    user: UserProgress,
    activities: Omit<ProgressCalculationInput, 'user'>[]
  ): Promise<ProgressCalculationResult[]> {
    const results: ProgressCalculationResult[] = [];
    let currentUser = user;

    for (const activity of activities) {
      const result = await this.calculateProgress({ ...activity, user: currentUser });
      
      if (result.success) {
        currentUser = result.user; // Use updated user for next calculation
      }
      
      results.push(result);
    }

    return results;
  }

  /**
   * Get progress summary for dashboard
   */
  static getProgressSummary(user: UserProgress): {
    global: {
      level: number;
      xp: number;
      xpToNext: number;
      progress: number;
      rank: string;
    };
    subjects: Array<{
      id: string;
      name: string;
      level: number;
      xp: number;
      progress: number;
    }>;
    streaks: {
      global: number;
      longest: number;
    };
    achievements: {
      total: number;
      recent: string[];
    };
  } {
    const globalProgress = XPSystem.calculateXPResult(user.globalStats.xp);
    
    const subjects = Object.entries(user.subjects).map(([id, progress]) => ({
      id,
      name: id, // Would get from subject config
      level: progress.level,
      xp: progress.xp,
      progress: XPSystem.calculateXPResult(progress.xp).progressPercentage
    }));

    return {
      global: {
        level: globalProgress.level,
        xp: globalProgress.currentXP,
        xpToNext: globalProgress.xpRemaining,
        progress: globalProgress.progressPercentage,
        rank: user.globalStats.rank
      },
      subjects,
      streaks: {
        global: user.globalStats.streak,
        longest: user.globalStats.longestStreak
      },
      achievements: {
        total: user.globalStats.achievements.length,
        recent: user.globalStats.achievements.slice(-5)
      }
    };
  }
}

export default ProgressCalculator;
