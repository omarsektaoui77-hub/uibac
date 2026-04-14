// High-Signal Context Engine
// Focus on quality signals that drive real AI intelligence

export interface HighSignalContext {
  // High-signal performance data
  accuracy: {
    recent: number; // Last 5 sessions
    trend: 'increasing' | 'decreasing' | 'stable';
    volatility: number; // Consistency measure
  };
  
  engagement: {
    timeSpent: {
      average: number; // minutes per session
      lastSession: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    inactivity: {
      gap: number; // days since last activity
      risk: 'low' | 'medium' | 'high';
      pattern: 'regular' | 'irregular';
    };
  };
  
  learning: {
    streaks: {
      current: number;
      longest: number;
      brokenRecently: boolean;
    };
    momentum: {
      speed: number; // Rate of progress
      direction: 'accelerating' | 'decelerating' | 'steady';
      quality: number; // Learning efficiency
    };
  };
  
  behavior: {
    sessionPattern: {
      preferredDuration: number;
      optimalTime: string[]; // Peak performance hours
      frequency: number; // Sessions per week
    };
    difficulty: {
      currentLevel: number;
      comfortZone: 'easy' | 'medium' | 'hard';
      adaptation: 'fast' | 'slow' | 'normal';
    };
  };
  
  // Simplified subject focus
  subjects: {
    focus: string; // Primary subject needing attention
    reason: string; // Why this subject needs focus
    strength: number; // 0-100 strength score
    urgency: number; // 0-100 urgency score
  };
}

/**
 * High-Signal Context Builder
* Extracts meaningful patterns from user behavior
 */
export class HighSignalContextBuilder {
  
  /**
   * Build high-signal context from user data
   */
  static async buildContext(userId: string): Promise<HighSignalContext> {
    try {
      // Get recent performance data
      const performance = await this.getPerformanceSignals(userId);
      
      // Get engagement patterns
      const engagement = await this.getBehaviorSignals(userId);
      
      // Get learning momentum
      const learning = await this.getLearningSignals(userId);
      
      // Get behavior patterns
      const behavior = await this.getBehaviorSignals(userId);
      
      // Determine subject focus
      const subjects = await this.getSubjectFocus(userId);
      
      return {
        accuracy: performance.accuracy,
        engagement: performance.engagement,
        learning,
        behavior,
        subjects
      };
      
    } catch (error) {
      console.error('High-signal context error:', error);
      return this.getDefaultContext();
    }
  }
  
  /**
   * Get performance signals (accuracy focus)
   */
  private static async getPerformanceSignals(userId: string): Promise<{
    accuracy: HighSignalContext['accuracy'];
    engagement: HighSignalContext['engagement'];
  }> {
    // Get last 5 sessions for accuracy analysis
    const recentSessions = await this.getRecentSessions(userId, 5);
    
    // Calculate accuracy metrics
    const accuracies = recentSessions.map(session => session.accuracy || 0);
    const recent = accuracies.length > 0 ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length : 0;
    
    // Calculate trend
    const trend = this.calculateTrend(accuracies);
    
    // Calculate volatility (consistency)
    const volatility = this.calculateVolatility(accuracies);
    
    // Get engagement data
    const timeSpent = recentSessions.map(session => session.timeSpent || 0);
    const averageTime = timeSpent.length > 0 ? timeSpent.reduce((sum, time) => sum + time, 0) / timeSpent.length : 0;
    const lastSessionTime = timeSpent[timeSpent.length - 1] || 0;
    const timeTrend = this.calculateTrend(timeSpent);
    
    // Calculate inactivity
    const lastActivity = recentSessions[0]?.timestamp || new Date();
    const gap = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    const inactivityRisk = this.getInactivityRisk(gap);
    const pattern = this.getInactivityPattern(userId, gap);
    
    return {
      accuracy: {
        recent,
        trend,
        volatility
      },
      engagement: {
        timeSpent: {
          average: averageTime,
          lastSession: lastSessionTime,
          trend: timeTrend
        },
        inactivity: {
          gap,
          risk: inactivityRisk,
          pattern
        }
      }
    };
  }
  
  /**
   * Get learning signals (momentum focus)
   */
  private static async getLearningSignals(userId: string): Promise<HighSignalContext['learning']> {
    // Get streak data
    const streakData = await this.getStreakData(userId);
    
    // Calculate momentum
    const progressRate = await this.getProgressRate(userId);
    const momentum = this.calculateMomentum(progressRate);
    
    return {
      streaks: streakData,
      momentum
    };
  }
  
  /**
   * Get behavior signals (patterns focus)
   */
  private static async getBehaviorSignals(userId: string): Promise<HighSignalContext['behavior']> {
    // Get session patterns
    const sessionData = await this.getSessionPatterns(userId);
    
    // Get difficulty adaptation
    const difficultyData = await this.getDifficultyAdaptation(userId);
    
    return {
      sessionPattern: sessionData,
      difficulty: difficultyData
    };
  }
  
  /**
   * Determine subject focus (simplified)
   */
  private static async getSubjectFocus(userId: string): Promise<HighSignalContext['subjects']> {
    // Get subject performance
    const subjectData = await this.getSubjectPerformance(userId);
    
    // Find subject needing most attention
    const focusSubject = this.findFocusSubject(subjectData);
    
    return {
      focus: focusSubject.name,
      reason: focusSubject.reason,
      strength: focusSubject.strength,
      urgency: focusSubject.urgency
    };
  }
  
  // Helper methods
  private static async getRecentSessions(userId: string, limit: number): Promise<any[]> {
    // Mock implementation - would fetch from database
    return [
      { accuracy: 85, timeSpent: 25, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { accuracy: 78, timeSpent: 30, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { accuracy: 92, timeSpent: 20, timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      { accuracy: 88, timeSpent: 35, timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000) },
      { accuracy: 75, timeSpent: 15, timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000) }
    ];
  }
  
  private static calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-3);
    const older = values.slice(0, Math.min(3, values.length));
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const diff = (recentAvg - olderAvg) / olderAvg;
    
    if (diff > 0.1) return 'increasing';
    if (diff < -0.1) return 'decreasing';
    return 'stable';
  }
  
  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }
  
  private static getInactivityRisk(gap: number): 'low' | 'medium' | 'high' {
    if (gap <= 1) return 'low';
    if (gap <= 3) return 'medium';
    return 'high';
  }
  
  private static getInactivityPattern(userId: string, gap: number): 'regular' | 'irregular' {
    // Simplified - would analyze historical patterns
    return gap <= 2 ? 'regular' : 'irregular';
  }
  
  private static async getStreakData(userId: string): Promise<HighSignalContext['learning']['streaks']> {
    // Mock implementation
    return {
      current: 3,
      longest: 7,
      brokenRecently: false
    };
  }
  
  private static async getProgressRate(userId: string): Promise<number> {
    // Mock implementation - would calculate XP rate over time
    return 15; // XP per hour
  }
  
  private static calculateMomentum(progressRate: number): HighSignalContext['learning']['momentum'] {
    const speed = progressRate / 10; // Normalize to 0-3 scale
    let direction: 'accelerating' | 'decelerating' | 'steady' = 'steady';
    const quality = Math.min(speed / 2, 1); // Learning efficiency
    
    if (speed > 2) direction = 'accelerating';
    else if (speed < 1) direction = 'decelerating';
    
    return { speed, direction, quality };
  }
  
  private static async getSessionPatterns(userId: string): Promise<HighSignalContext['behavior']['sessionPattern']> {
    // Mock implementation
    return {
      preferredDuration: 25,
      optimalTime: ['09:00', '14:00', '19:00'],
      frequency: 4
    };
  }
  
  private static async getDifficultyAdaptation(userId: string): Promise<HighSignalContext['behavior']['difficulty']> {
    // Mock implementation
    return {
      currentLevel: 3,
      comfortZone: 'medium',
      adaptation: 'normal'
    };
  }
  
  private static async getSubjectPerformance(userId: string): Promise<any[]> {
    // Mock implementation
    return [
      { name: 'mathematics', accuracy: 75, timeSpent: 120, recentActivity: 2 },
      { name: 'physics', accuracy: 88, timeSpent: 90, recentActivity: 1 },
      { name: 'philosophy', accuracy: 92, timeSpent: 60, recentActivity: 3 }
    ];
  }
  
  private static findFocusSubject(subjectData: any[]): {
    name: string;
    reason: string;
    strength: number;
    urgency: number;
  } {
    // Find subject with lowest accuracy + recent inactivity
    const focusSubject = subjectData.reduce((worst, subject) => {
      const subjectScore = subject.accuracy * 0.6 + (subject.recentActivity > 2 ? 20 : 0);
      const worstScore = worst.accuracy * 0.6 + (worst.recentActivity > 2 ? 20 : 0);
      
      return subjectScore < worstScore ? subject : worst;
    });
    
    const strength = focusSubject.accuracy;
    const urgency = 100 - strength;
    
    let reason = '';
    if (focusSubject.accuracy < 70) {
      reason = `Low accuracy (${focusSubject.accuracy}%) needs improvement`;
    } else if (focusSubject.recentActivity > 2) {
      reason = `Inactive for ${focusSubject.recentActivity} days`;
    } else {
      reason = `Opportunity to strengthen ${focusSubject.name} foundation`;
    }
    
    return {
      name: focusSubject.name,
      reason,
      strength,
      urgency
    };
  }
  
  private static getDefaultContext(): HighSignalContext {
    return {
      accuracy: {
        recent: 0,
        trend: 'stable',
        volatility: 0
      },
      engagement: {
        timeSpent: {
          average: 0,
          lastSession: 0,
          trend: 'stable'
        },
        inactivity: {
          gap: 0,
          risk: 'low',
          pattern: 'regular'
        }
      },
      learning: {
        streaks: {
          current: 0,
          longest: 0,
          brokenRecently: false
        },
        momentum: {
          speed: 0,
          direction: 'steady',
          quality: 0
        }
      },
      behavior: {
        sessionPattern: {
          preferredDuration: 25,
          optimalTime: ['09:00', '14:00', '19:00'],
          frequency: 3
        },
        difficulty: {
          currentLevel: 1,
          comfortZone: 'medium',
          adaptation: 'normal'
        }
      },
      subjects: {
        focus: 'general',
        reason: 'No specific focus identified',
        strength: 50,
        urgency: 50
      }
    };
  }
}

export default HighSignalContextBuilder;
