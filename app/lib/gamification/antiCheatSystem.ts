// Anti-Cheat System with XP Rate Limiting
// Prevents spam, abuse, and ensures fair gameplay

export interface AntiCheatConfig {
  maxXPPerMinute: number;
  maxXPPerHour: number;
  maxXPPerDay: number;
  maxQuestionsPerMinute: number;
  maxQuestionsPerHour: number;
  maxQuestionsPerDay: number;
  sessionTimeout: number; // minutes
  suspiciousActivityThreshold: number;
  cooldownPeriod: number; // minutes
}

export interface AntiCheatValidation {
  blocked: boolean;
  reasons: string[];
  warnings: string[];
  flags: string[];
  recommendations: string[];
  riskScore: number; // 0-100
}

export interface ActivityLog {
  timestamp: number;
  activity: string;
  xpEarned: number;
  duration: number; // seconds
  isCorrect: boolean;
  difficulty: string;
  suspicious: boolean;
}

/**
 * Comprehensive anti-cheat and rate limiting system
 */
export class AntiCheatSystem {
  private static readonly DEFAULT_CONFIG: AntiCheatConfig = {
    maxXPPerMinute: 100,
    maxXPPerHour: 500,
    maxXPPerDay: 2000,
    maxQuestionsPerMinute: 10,
    maxQuestionsPerHour: 60,
    maxQuestionsPerDay: 200,
    sessionTimeout: 30, // 30 minutes
    suspiciousActivityThreshold: 3,
    cooldownPeriod: 5 // 5 minutes
  };

  private static readonly SUSPICIOUS_PATTERNS = [
    'instant_answers', // Answering too quickly
    'perfect_streak',  // Too many perfect answers in a row
    'consistent_timing', // Same timing for all answers
    'rapid_fire', // Answering questions at machine speed
    'session_abuse', // Unusually long sessions
    'xp_inflation', // Unusual XP earning patterns
    'time_travel', // Backdated activities
    'duplicate_sessions' // Multiple simultaneous sessions
  ];

  /**
   * Validate user activity for anti-cheat
   */
  static async validateActivity(
    user: any, // UserProgress type
    earnedXP: number,
    activityType: string = 'question',
    additionalData: any = {}
  ): Promise<AntiCheatValidation> {
    const config = { ...this.DEFAULT_CONFIG };
    const now = Date.now();
    const reasons: string[] = [];
    const warnings: string[] = [];
    const flags: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Check rate limits
    const rateLimitCheck = this.checkRateLimits(user, earnedXP, config);
    reasons.push(...rateLimitCheck.reasons);
    warnings.push(...rateLimitCheck.warnings);
    flags.push(...rateLimitCheck.flags);
    riskScore += rateLimitCheck.riskScore;

    // Check session validity
    const sessionCheck = this.checkSessionValidity(user, now, config);
    reasons.push(...sessionCheck.reasons);
    warnings.push(...sessionCheck.warnings);
    flags.push(...sessionCheck.flags);
    riskScore += sessionCheck.riskScore;

    // Check activity patterns
    const patternCheck = this.checkActivityPatterns(user, additionalData);
    reasons.push(...patternCheck.reasons);
    warnings.push(...patternCheck.warnings);
    flags.push(...patternCheck.flags);
    riskScore += patternCheck.riskScore;

    // Check temporal consistency
    const temporalCheck = this.checkTemporalConsistency(user, additionalData);
    reasons.push(...temporalCheck.reasons);
    warnings.push(...temporalCheck.warnings);
    flags.push(...temporalCheck.flags);
    riskScore += temporalCheck.riskScore;

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(riskScore, reasons));

    const blocked = riskScore >= 80 || reasons.some(reason => 
      reason.includes('blocked') || reason.includes('suspicious')
    );

    return {
      blocked,
      reasons,
      warnings,
      flags,
      recommendations,
      riskScore: Math.min(100, riskScore)
    };
  }

  /**
   * Check rate limits
   */
  private static checkRateLimits(
    user: any,
    earnedXP: number,
    config: AntiCheatConfig
  ): {
    reasons: string[];
    warnings: string[];
    flags: string[];
    riskScore: number;
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const flags: string[] = [];
    let riskScore = 0;

    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Check XP limits
    if (user.antiCheat.xpGainedThisHour + earnedXP > config.maxXPPerHour) {
      reasons.push(`XP limit exceeded for hour: ${user.antiCheat.xpGainedThisHour + earnedXP}/${config.maxXPPerHour}`);
      riskScore += 40;
    } else if (user.antiCheat.xpGainedThisHour + earnedXP > config.maxXPPerHour * 0.8) {
      warnings.push('Approaching hourly XP limit');
      riskScore += 10;
    }

    if (user.antiCheat.xpGainedToday + earnedXP > config.maxXPPerDay) {
      reasons.push(`XP limit exceeded for day: ${user.antiCheat.xpGainedToday + earnedXP}/${config.maxXPPerDay}`);
      riskScore += 50;
    } else if (user.antiCheat.xpGainedToday + earnedXP > config.maxXPPerDay * 0.8) {
      warnings.push('Approaching daily XP limit');
      riskScore += 15;
    }

    // Check question limits
    if (user.antiCheat.questionsAnsweredThisSession + 1 > config.maxQuestionsPerMinute) {
      reasons.push(`Question limit exceeded for minute`);
      riskScore += 30;
      flags.push('rapid_fire');
    }

    return { reasons, warnings, flags, riskScore };
  }

  /**
   * Check session validity
   */
  private static checkSessionValidity(
    user: any,
    now: number,
    config: AntiCheatConfig
  ): {
    reasons: string[];
    warnings: string[];
    flags: string[];
    riskScore: number;
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const flags: string[] = [];
    let riskScore = 0;

    const sessionDuration = now - new Date(user.antiCheat.sessionStartTime).getTime();
    const sessionMinutes = sessionDuration / (1000 * 60);

    // Check for unusually long sessions
    if (sessionMinutes > config.sessionTimeout * 2) {
      reasons.push('Unusually long session detected');
      riskScore += 25;
      flags.push('session_abuse');
    } else if (sessionMinutes > config.sessionTimeout) {
      warnings.push('Long session detected - consider taking a break');
      riskScore += 10;
    }

    // Check for session timeout
    if (sessionMinutes > config.sessionTimeout * 3) {
      reasons.push('Session timeout - please start a new session');
      riskScore += 40;
    }

    // Check for multiple sessions
    const timeSinceLastActivity = now - user.antiCheat.lastActivityTimestamp;
    if (timeSinceLastActivity < 1000) { // Less than 1 second
      reasons.push('Multiple activities detected simultaneously');
      riskScore += 35;
      flags.push('duplicate_sessions');
    }

    return { reasons, warnings, flags, riskScore };
  }

  /**
   * Check activity patterns
   */
  private static checkActivityPatterns(
    user: any,
    additionalData: any
  ): {
    reasons: string[];
    warnings: string[];
    flags: string[];
    riskScore: number;
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const flags: string[] = [];
    let riskScore = 0;

    // Check for instant answers
    if (additionalData.timeSpent && additionalData.timeSpent < 1) {
      reasons.push('Answer time too fast - possible automation');
      riskScore += 30;
      flags.push('instant_answers');
    } else if (additionalData.timeSpent && additionalData.timeSpent < 3) {
      warnings.push('Very fast answer time detected');
      riskScore += 10;
    }

    // Check for perfect streak
    if (additionalData.accuracy && additionalData.accuracy > 95) {
      warnings.push('Unusually high accuracy detected');
      riskScore += 15;
      flags.push('perfect_streak');
    }

    // Check for consistent timing
    if (additionalData.averageTime && additionalData.variance < 0.5) {
      warnings.push('Consistent answer timing detected');
      riskScore += 10;
      flags.push('consistent_timing');
    }

    return { reasons, warnings, flags, riskScore };
  }

  /**
   * Check temporal consistency
   */
  private static checkTemporalConsistency(
    user: any,
    additionalData: any
  ): {
    reasons: string[];
    warnings: string[];
    flags: string[];
    riskScore: number;
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const flags: string[] = [];
    let riskScore = 0;

    const now = Date.now();
    const activityTime = additionalData.timestamp || now;

    // Check for backdated activities
    if (activityTime > now) {
      reasons.push('Future timestamp detected - time travel');
      riskScore += 50;
      flags.push('time_travel');
    } else if (now - activityTime > 24 * 60 * 60 * 1000) {
      warnings.push('Backdated activity detected');
      riskScore += 15;
    }

    // Check for rapid succession
    const timeSinceLastActivity = now - user.antiCheat.lastActivityTimestamp;
    if (timeSinceLastActivity < 500) { // Less than 0.5 seconds
      reasons.push('Activities too close together');
      riskScore += 20;
      flags.push('rapid_fire');
    }

    return { reasons, warnings, flags, riskScore };
  }

  /**
   * Generate recommendations based on risk assessment
   */
  private static generateRecommendations(
    riskScore: number,
    reasons: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 80) {
      recommendations.push('Activity blocked - please wait before continuing');
      recommendations.push('Review our fair play guidelines');
    } else if (riskScore >= 60) {
      recommendations.push('Take a break and return later');
      recommendations.push('Slow down your pace to maintain fair play');
    } else if (riskScore >= 40) {
      recommendations.push('Consider taking a short break');
      recommendations.push('Focus on accuracy over speed');
    } else if (riskScore >= 20) {
      recommendations.push('Maintain a steady pace');
    }

    if (reasons.some(reason => reason.includes('XP limit'))) {
      recommendations.push('XP limits reset daily - try again tomorrow');
    }

    if (reasons.some(reason => reason.includes('Question limit'))) {
      recommendations.push('Question limits reset hourly - take a break');
    }

    return recommendations;
  }

  /**
   * Reset daily limits
   */
  static resetDailyLimits(user: any): any {
    const now = new Date().toISOString();
    
    return {
      ...user,
      antiCheat: {
        ...user.antiCheat,
        xpGainedToday: 0,
        xpGainedThisHour: 0,
        questionsAnsweredThisSession: 0,
        lastXPReset: now,
        suspiciousActivityCount: 0
      }
    };
  }

  /**
   * Reset hourly limits
   */
  static resetHourlyLimits(user: any): any {
    return {
      ...user,
      antiCheat: {
        ...user.antiCheat,
        xpGainedThisHour: 0,
        questionsAnsweredThisSession: 0
      }
    };
  }

  /**
   * Start new session
   */
  static startNewSession(user: any): any {
    const now = new Date().toISOString();
    
    return {
      ...user,
      antiCheat: {
        ...user.antiCheat,
        sessionStartTime: now,
        questionsAnsweredThisSession: 0,
        xpGainedThisHour: 0
      }
    };
  }

  /**
   * Log suspicious activity
   */
  static logSuspiciousActivity(
    userId: string,
    activity: ActivityLog,
    riskScore: number
  ): void {
    // In production, this would log to a monitoring system
    console.warn(`Suspicious activity detected for user ${userId}:`, {
      activity,
      riskScore,
      timestamp: new Date().toISOString()
    });

    // If risk score is high, trigger additional monitoring
    if (riskScore >= 70) {
      console.error(`HIGH RISK ACTIVITY - User ${userId}:`, activity);
    }
  }

  /**
   * Get user risk assessment
   */
  static getUserRiskAssessment(user: any): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    flags: string[];
    recommendations: string[];
    lastSuspiciousActivity: string | null;
  } {
    const flags = [];
    let riskScore = 0;

    // Calculate risk based on current metrics
    if (user.antiCheat.suspiciousActivityCount > 5) {
      riskScore += 30;
      flags.push('repeated_suspicious_activity');
    }

    if (user.antiCheat.xpGainedToday > 1500) {
      riskScore += 20;
      flags.push('high_xp_earning');
    }

    if (user.antiCheat.questionsAnsweredThisSession > 50) {
      riskScore += 15;
      flags.push('high_activity_volume');
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    const recommendations = this.generateRiskRecommendations(riskLevel, flags);

    return {
      riskLevel,
      riskScore,
      flags,
      recommendations,
      lastSuspiciousActivity: user.antiCheat.lastActivityTimestamp 
        ? new Date(user.antiCheat.lastActivityTimestamp).toISOString() 
        : null
    };
  }

  /**
   * Generate risk-based recommendations
   */
  private static generateRiskRecommendations(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    flags: string[]
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('Immediate review required');
        recommendations.push('Consider temporary account suspension');
        recommendations.push('Manual verification needed');
        break;
      case 'high':
        recommendations.push('Increased monitoring required');
        recommendations.push('Limit session duration');
        recommendations.push('Require additional verification');
        break;
      case 'medium':
        recommendations.push('Monitor closely for patterns');
        recommendations.push('Implement rate limiting');
        recommendations.push('Send warning notifications');
        break;
      case 'low':
        recommendations.push('Continue normal monitoring');
        recommendations.push('Maintain current restrictions');
        break;
    }

    if (flags.includes('high_xp_earning')) {
      recommendations.push('Review XP earning patterns');
    }

    if (flags.includes('high_activity_volume')) {
      recommendations.push('Implement session time limits');
    }

    return recommendations;
  }

  /**
   * Validate batch activities
   */
  static async validateBatchActivities(
    user: any,
    activities: Array<{
      xp: number;
      timestamp: number;
      type: string;
      data?: any;
    }>
  ): Promise<AntiCheatValidation[]> {
    const results: AntiCheatValidation[] = [];
    let cumulativeRisk = 0;

    for (const activity of activities) {
      const validation = await this.validateActivity(
        user,
        activity.xp,
        activity.type,
        activity.data
      );

      // Increase risk for subsequent activities if previous were suspicious
      if (cumulativeRisk > 50) {
        validation.riskScore += 20;
        validation.warnings.push('Cumulative risk assessment applied');
      }

      cumulativeRisk += validation.riskScore;
      results.push(validation);

      // If blocked, stop processing further activities
      if (validation.blocked) {
        break;
      }
    }

    return results;
  }

  /**
   * Get anti-cheat statistics
   */
  static getAntiCheatStats(users: any[]): {
    totalUsers: number;
    averageRiskScore: number;
    riskDistribution: Record<string, number>;
    commonFlags: Record<string, number>;
    blockedActivities: number;
  } {
    const riskScores = users.map(user => this.getUserRiskAssessment(user).riskScore);
    const averageRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / users.length;

    const riskDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const commonFlags: Record<string, number> = {};

    for (const user of users) {
      const assessment = this.getUserRiskAssessment(user);
      riskDistribution[assessment.riskLevel]++;
      
      for (const flag of assessment.flags) {
        commonFlags[flag] = (commonFlags[flag] || 0) + 1;
      }
    }

    return {
      totalUsers: users.length,
      averageRiskScore,
      riskDistribution,
      commonFlags,
      blockedActivities: 0 // Would be tracked in production
    };
  }

  /**
   * Update user metrics after activity
   */
  static updateUserMetrics(
    user: any,
    earnedXP: number,
    activityType: string
  ): any {
    const now = Date.now();
    
    return {
      ...user,
      antiCheat: {
        ...user.antiCheat,
        xpGainedToday: user.antiCheat.xpGainedToday + earnedXP,
        xpGainedThisHour: user.antiCheat.xpGainedThisHour + earnedXP,
        questionsAnsweredThisSession: user.antiCheat.questionsAnsweredThisSession + 1,
        lastActivityTimestamp: now
      }
    };
  }

  /**
   * Check if user is in cooldown
   */
  static isInCooldown(user: any, config: AntiCheatConfig = this.DEFAULT_CONFIG): boolean {
    const lastActivity = new Date(user.antiCheat.lastActivityTimestamp);
    const now = new Date();
    const timeSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60); // minutes

    return timeSinceLastActivity < config.cooldownPeriod;
  }

  /**
   * Get cooldown remaining time
   */
  static getCooldownRemaining(user: any): number {
    const config = this.DEFAULT_CONFIG;
    const lastActivity = new Date(user.antiCheat.lastActivityTimestamp);
    const now = new Date();
    const timeSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60); // minutes

    return Math.max(0, config.cooldownPeriod - timeSinceLastActivity);
  }
}

export default AntiCheatSystem;
