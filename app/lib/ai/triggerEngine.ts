// AI Trigger Engine
// Controls when AI calls are made to optimize costs

export interface TriggerEvent {
  type: 'new_session' | 'streak_break' | 'level_up' | 'inactivity_threshold' | 'performance_drop' | 'subject_change';
  userId: string;
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TriggerThreshold {
  inactivity: {
    hours: number; // Hours of inactivity before trigger
    minXPChange: number; // Minimum XP change to trigger
  };
  performance: {
    accuracyDrop: number; // Percentage drop in accuracy
    streakLoss: boolean; // Trigger on streak break
  };
  progress: {
    levelUp: boolean; // Trigger on level up
    xpThreshold: number; // Minimum XP gained
  };
  session: {
    newSession: boolean; // Trigger on new session
    cooldown: number; // Minutes between AI calls
  };
}

/**
 * AI Trigger Engine
 * Smart triggering to control AI costs
 */
export class AITriggerEngine {
  private static triggers: Map<string, TriggerEvent[]> = new Map();
  private static lastAICall: Map<string, Date> = new Map();
  private static thresholds: TriggerThreshold = {
    inactivity: {
      hours: 24, // 24 hours
      minXPChange: 50 // 50 XP minimum
    },
    performance: {
      accuracyDrop: 15, // 15% drop
      streakLoss: true
    },
    progress: {
      levelUp: true,
      xpThreshold: 100 // 100 XP gained
    },
    session: {
      newSession: true,
      cooldown: 30 // 30 minutes between AI calls
    }
  };

  /**
   * Check if AI should be triggered
   */
  static shouldTriggerAI(
    userId: string,
    eventType: TriggerEvent['type'],
    eventData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    try {
      // Check cooldown first
      if (this.isInCooldown(userId)) {
        return {
          shouldTrigger: false,
          reason: 'AI call in cooldown period',
          priority: 'low'
        };
      }

      // Check specific trigger conditions
      const result = this.evaluateTrigger(userId, eventType, eventData);
      
      if (result.shouldTrigger) {
        // Record trigger
        this.recordTrigger(userId, {
          type: eventType,
          userId,
          timestamp: new Date(),
          data: eventData,
          priority: result.priority
        });
        
        // Update last AI call time
        this.lastAICall.set(userId, new Date());
      }

      return result;
    } catch (error) {
      console.error('Trigger evaluation error:', error);
      return {
        shouldTrigger: false,
        reason: 'Trigger evaluation failed',
        priority: 'low'
      };
    }
  }

  /**
   * Evaluate specific trigger conditions
   */
  private static evaluateTrigger(
    userId: string,
    eventType: TriggerEvent['type'],
    eventData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    switch (eventType) {
      case 'new_session':
        return this.evaluateNewSession(userId, eventData);
      
      case 'streak_break':
        return this.evaluateStreakBreak(userId, eventData);
      
      case 'level_up':
        return this.evaluateLevelUp(userId, eventData);
      
      case 'inactivity_threshold':
        return this.evaluateInactivity(userId, eventData);
      
      case 'performance_drop':
        return this.evaluatePerformanceDrop(userId, eventData);
      
      case 'subject_change':
        return this.evaluateSubjectChange(userId, eventData);
      
      default:
        return {
          shouldTrigger: false,
          reason: 'Unknown trigger type',
          priority: 'low'
        };
    }
  }

  /**
   * Evaluate new session trigger
   */
  private static evaluateNewSession(
    userId: string,
    sessionData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    if (!this.thresholds.session.newSession) {
      return {
        shouldTrigger: false,
        reason: 'New session triggers disabled',
        priority: 'low'
      };
    }

    // Check if this is actually a new session (not just page refresh)
    const lastSession = sessionData?.lastSessionTime;
    const now = new Date();
    const sessionGap = lastSession ? (now.getTime() - lastSession.getTime()) / (1000 * 60) : Infinity;
    
    if (sessionGap > 60) { // More than 1 hour since last session
      return {
        shouldTrigger: true,
        reason: 'New user session detected',
        priority: 'medium'
      };
    }

    return {
      shouldTrigger: false,
      reason: 'Not a new session',
      priority: 'low'
    };
  }

  /**
   * Evaluate streak break trigger
   */
  private static evaluateStreakBreak(
    userId: string,
    streakData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    if (!this.thresholds.performance.streakLoss) {
      return {
        shouldTrigger: false,
        reason: 'Streak break triggers disabled',
        priority: 'low'
      };
    }

    const { currentStreak, previousStreak } = streakData;
    
    if (previousStreak > 0 && currentStreak === 0) {
      return {
        shouldTrigger: true,
        reason: `Streak broken (${previousStreak} → 0)`,
        priority: 'high'
      };
    }

    return {
      shouldTrigger: false,
      reason: 'No streak break',
      priority: 'low'
    };
  }

  /**
   * Evaluate level up trigger
   */
  private static evaluateLevelUp(
    userId: string,
    progressData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    if (!this.thresholds.progress.levelUp) {
      return {
        shouldTrigger: false,
        reason: 'Level up triggers disabled',
        priority: 'low'
      };
    }

    const { currentLevel, previousLevel } = progressData;
    
    if (currentLevel > previousLevel) {
      return {
        shouldTrigger: true,
        reason: `Level up achieved (${previousLevel} → ${currentLevel})`,
        priority: 'high'
      };
    }

    return {
      shouldTrigger: false,
      reason: 'No level up',
      priority: 'low'
    };
  }

  /**
   * Evaluate inactivity threshold trigger
   */
  private static evaluateInactivity(
    userId: string,
    activityData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    const { lastActivity, totalXP, previousXP } = activityData;
    const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
    const xpGained = totalXP - previousXP;
    
    if (hoursSinceActivity >= this.thresholds.inactivity.hours && 
        xpGained >= this.thresholds.inactivity.minXPChange) {
      return {
        shouldTrigger: true,
        reason: `Inactivity threshold reached (${hoursSinceActivity.toFixed(1)}h, +${xpGained}XP)`,
        priority: 'medium'
      };
    }

    return {
      shouldTrigger: false,
      reason: 'Inactivity threshold not reached',
      priority: 'low'
    };
  }

  /**
   * Evaluate performance drop trigger
   */
  private static evaluatePerformanceDrop(
    userId: string,
    performanceData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    if (!this.thresholds.performance.accuracyDrop) {
      return {
        shouldTrigger: false,
        reason: 'Performance drop triggers disabled',
        priority: 'low'
      };
    }

    const { currentAccuracy, previousAccuracy } = performanceData;
    
    if (previousAccuracy > 0) {
      const accuracyDrop = ((previousAccuracy - currentAccuracy) / previousAccuracy) * 100;
      
      if (accuracyDrop >= this.thresholds.performance.accuracyDrop) {
        return {
          shouldTrigger: true,
          reason: `Performance drop detected (${previousAccuracy}% → ${currentAccuracy}%)`,
          priority: 'high'
        };
      }
    }

    return {
      shouldTrigger: false,
      reason: 'No significant performance drop',
      priority: 'low'
    };
  }

  /**
   * Evaluate subject change trigger
   */
  private static evaluateSubjectChange(
    userId: string,
    subjectData: any
  ): {
    shouldTrigger: boolean;
    reason: string;
    priority: TriggerEvent['priority'];
  } {
    const { currentSubject, previousSubject, timeInSubject } = subjectData;
    
    // Trigger if user switches subjects after significant time
    if (previousSubject && currentSubject !== previousSubject && timeInSubject > 15) { // 15+ minutes
      return {
        shouldTrigger: true,
        reason: `Subject change detected (${previousSubject} → ${currentSubject})`,
        priority: 'medium'
      };
    }

    return {
      shouldTrigger: false,
      reason: 'No significant subject change',
      priority: 'low'
    };
  }

  /**
   * Check if user is in cooldown period
   */
  private static isInCooldown(userId: string): boolean {
    const lastCall = this.lastAICall.get(userId);
    if (!lastCall) return false;
    
    const cooldownPeriod = this.thresholds.session.cooldown * 60 * 1000; // Convert to milliseconds
    const timeSinceLastCall = Date.now() - lastCall.getTime();
    
    return timeSinceLastCall < cooldownPeriod;
  }

  /**
   * Record trigger event
   */
  private static recordTrigger(userId: string, trigger: TriggerEvent): void {
    if (!this.triggers.has(userId)) {
      this.triggers.set(userId, []);
    }
    
    const userTriggers = this.triggers.get(userId)!;
    userTriggers.push(trigger);
    
    // Keep only last 50 triggers per user
    if (userTriggers.length > 50) {
      this.triggers.set(userId, userTriggers.slice(-50));
    }
  }

  /**
   * Get trigger history for user
   */
  static getTriggerHistory(userId: string, limit: number = 20): TriggerEvent[] {
    const userTriggers = this.triggers.get(userId) || [];
    return userTriggers.slice(-limit);
  }

  /**
   * Get Trigger statistics
   */
  static getTriggerStats(userId?: string): {
    totalTriggers: number;
    triggerTypes: Record<string, number>;
    averageTriggersPerDay: number;
    mostCommonTrigger: string;
  } {
    const allTriggers: TriggerEvent[] = [];
    
    if (userId) {
      const userTriggers = this.triggers.get(userId) || [];
      allTriggers.push(...userTriggers);
    } else {
      for (const userTriggerList of this.triggers.values()) {
        allTriggers.push(...userTriggerList);
      }
    }

    // Calculate statistics
    const triggerTypes: Record<string, number> = {};
    allTriggers.forEach(trigger => {
      triggerTypes[trigger.type] = (triggerTypes[trigger.type] || 0) + 1;
    });

    const mostCommonTrigger = Object.entries(triggerTypes)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    // Calculate average triggers per day
    const oldestTrigger = allTriggers.length > 0 ? allTriggers[0].timestamp : new Date();
    const daysSinceOldest = (Date.now() - oldestTrigger.getTime()) / (1000 * 60 * 60 * 24);
    const averageTriggersPerDay = daysSinceOldest > 0 ? allTriggers.length / daysSinceOldest : 0;

    return {
      totalTriggers: allTriggers.length,
      triggerTypes,
      averageTriggersPerDay,
      mostCommonTrigger
    };
  }

  /**
   * Update trigger thresholds
   */
  static updateThresholds(newThresholds: Partial<TriggerThreshold>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('AI Trigger thresholds updated:', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  static getThresholds(): TriggerThreshold {
    return { ...this.thresholds };
  }

  /**
   * Clear trigger history
   */
  static clearTriggerHistory(userId?: string): void {
    if (userId) {
      this.triggers.delete(userId);
      this.lastAICall.delete(userId);
    } else {
      this.triggers.clear();
      this.lastAICall.clear();
    }
  }

  /**
   * Get cost savings from trigger system
   */
  static getCostSavings(): {
    estimatedCallsPrevented: number;
    estimatedCostSaved: number;
    savingsPercentage: number;
  } {
    const stats = this.getTriggerStats();
    const totalPossibleCalls = stats.totalTriggers * 2; // Assume 2x potential calls
    const actualCalls = stats.totalTriggers;
    const preventedCalls = totalPossibleCalls - actualCalls;
    
    // Estimate cost savings (assuming $0.02 per AI call)
    const estimatedCostSaved = preventedCalls * 0.02;
    const savingsPercentage = totalPossibleCalls > 0 ? (preventedCalls / totalPossibleCalls) * 100 : 0;

    return {
      estimatedCallsPrevented: preventedCalls,
      estimatedCostSaved,
      savingsPercentage
    };
  }
}

export default AITriggerEngine;
