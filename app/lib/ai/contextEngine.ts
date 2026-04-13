// AI Context Engine
// Builds structured user context for LLM-powered coaching decisions

import { UserProgress } from '@/app/lib/gamification/userSchema';
import { ProgressAnalytics } from '@/app/lib/analytics/progressAnalytics';
import { db } from '@/app/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

export interface AIContext {
  stats: {
    xp: number;
    level: number;
    streak: number;
    rank: string;
    totalStudyTime: number;
    averageAccuracy: number;
  };
  
  subjects: Record<string, {
    xp: number;
    level: number;
    accuracy: number;
    lastActivity: string | null;
    questionsAnswered: number;
    timeSpent: number;
    strength: number; // Calculated strength score
  }>;
  
  behavior: {
    dailyUsageMinutes: number;
    consistencyScore: number;
    sessionFrequency: number;
    dropOffPoints: string[];
    peakHours: number[];
    studyPattern: 'consistent' | 'irregular' | 'declining' | 'improving';
    burnoutRisk: 'low' | 'medium' | 'high';
  };
  
  recentActivity: Array<{
    subject: string;
    xpEarned: number;
    successRate: number;
    timestamp: string;
    duration: number;
    difficulty: string;
  }>;
  
  aiHistory: Array<{
    recommendation: string;
    accepted: boolean;
    effectiveness: number;
    timestamp: string;
  }>;
  
  metadata: {
    generatedAt: string;
    dataCompleteness: number; // 0-100
    confidenceLevel: number; // Based on data quality
  };
}

export interface ContextBuildingOptions {
  includeRecentActivity?: boolean;
  activityDays?: number;
  includeAIHistory?: boolean;
  historyDays?: number;
  includeBehaviorAnalysis?: boolean;
}

/**
 * AI Context Builder
 * Creates comprehensive user context for AI coaching decisions
 */
export class AIContextEngine {
  
  /**
   * Build complete AI context for a user
   */
  static async buildContext(
    userId: string, 
    options: ContextBuildingOptions = {}
  ): Promise<AIContext> {
    const {
      includeRecentActivity = true,
      activityDays = 7,
      includeAIHistory = true,
      historyDays = 30,
      includeBehaviorAnalysis = true
    } = options;

    try {
      // Fetch user progress data
      const userProgress = await this.getUserProgress(userId);
      if (!userProgress) {
        throw new Error('User progress not found');
      }

      // Fetch analytics data
      const analytics = await this.getUserAnalytics(userId);
      
      // Build stats section
      const stats = this.buildStatsSection(userProgress, analytics);
      
      // Build subjects section
      const subjects = this.buildSubjectsSection(userProgress, analytics);
      
      // Build behavior section
      const behavior = includeBehaviorAnalysis 
        ? await this.buildBehaviorSection(userId, analytics)
        : this.getDefaultBehavior();
      
      // Build recent activity
      const recentActivity = includeRecentActivity
        ? await this.getRecentActivity(userId, activityDays)
        : [];
      
      // Build AI history
      const aiHistory = includeAIHistory
        ? await this.getAIHistory(userId, historyDays)
        : [];

      // Calculate metadata
      const metadata = this.buildMetadata(userProgress, analytics, recentActivity);

      return {
        stats,
        subjects,
        behavior,
        recentActivity,
        aiHistory,
        metadata
      };

    } catch (error) {
      console.error('Error building AI context:', error);
      throw error;
    }
  }

  /**
   * Build stats section from user progress
   */
  private static buildStatsSection(
    userProgress: UserProgress, 
    analytics: any
  ): AIContext['stats'] {
    const rankSystem = require('@/app/lib/gamification/rankSystem');
    const rankProgress = rankSystem.RankSystem.getRankProgress(userProgress.globalStats.level);

    return {
      xp: userProgress.globalStats.xp,
      level: userProgress.globalStats.level,
      streak: userProgress.globalStats.streak,
      rank: rankProgress?.currentRank?.name || 'Beginner',
      totalStudyTime: analytics?.totalStudyTime || 0,
      averageAccuracy: analytics?.averageAccuracy || 0
    };
  }

  /**
   * Build subjects section with detailed analysis
   */
  private static buildSubjectsSection(
    userProgress: UserProgress, 
    analytics: any
  ): AIContext['subjects'] {
    const subjects: AIContext['subjects'] = {};
    const xpSystem = require('@/app/lib/gamification/xpSystem');

    for (const [subjectId, subjectData] of Object.entries(userProgress.subjects)) {
      const subjectXP = subjectData.xp;
      const subjectLevel = xpSystem.XPSystem.calculateLevel(subjectXP);
      const subjectAnalytics = analytics?.subjectPerformance?.[subjectId];

      // Calculate strength score based on multiple factors
      const strength = this.calculateSubjectStrength(
        subjectXP,
        subjectAnalytics?.accuracy || 0,
        subjectData.questionsAnswered,
        subjectData.lastActivity
      );

      subjects[subjectId] = {
        xp: subjectXP,
        level: subjectLevel,
        accuracy: subjectAnalytics?.accuracy || 0,
        lastActivity: subjectData.lastActivity,
        questionsAnswered: subjectData.questionsAnswered,
        timeSpent: subjectAnalytics?.timeSpent || 0,
        strength
      };
    }

    return subjects;
  }

  /**
   * Calculate subject strength score (0-100)
   */
  private static calculateSubjectStrength(
    xp: number,
    accuracy: number,
    questionsAnswered: number,
    lastActivity: string | null
  ): number {
    let strength = 0;

    // XP contribution (40%)
    const maxXP = 10000; // Adjust based on your system
    strength += Math.min((xp / maxXP) * 40, 40);

    // Accuracy contribution (30%)
    strength += (accuracy / 100) * 30;

    // Activity contribution (20%)
    const activityScore = Math.min((questionsAnswered / 100) * 20, 20);
    strength += activityScore;

    // Recency contribution (10%)
    if (lastActivity) {
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyScore = Math.max(0, 10 - daysSinceActivity);
      strength += recencyScore;
    }

    return Math.round(strength);
  }

  /**
   * Build behavior section with pattern analysis
   */
  private static async buildBehaviorSection(
    userId: string, 
    analytics: any
  ): Promise<AIContext['behavior']> {
    // Get detailed activity data for pattern analysis
    const activityData = await this.getDetailedActivityData(userId, 30);
    
    return {
      dailyUsageMinutes: analytics?.learningPatterns?.averageSessionLength || 0,
      consistencyScore: analytics?.learningPatterns?.consistencyScore || 0,
      sessionFrequency: this.calculateSessionFrequency(activityData),
      dropOffPoints: this.identifyDropOffPoints(activityData),
      peakHours: this.identifyPeakHours(activityData),
      studyPattern: this.analyzeStudyPattern(activityData),
      burnoutRisk: this.assessBurnoutRisk(activityData, analytics)
    };
  }

  /**
   * Get recent activity data
   */
  private static async getRecentActivity(
    userId: string, 
    days: number
  ): Promise<AIContext['recentActivity']> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      collection(db, 'progressLogs'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        subject: data.subjectId || 'general',
        xpEarned: data.xpEarned,
        successRate: data.metadata?.isCorrect !== false ? 100 : 0,
        timestamp: data.timestamp.toDate().toISOString(),
        duration: data.metadata?.timeSpent || 0,
        difficulty: data.metadata?.difficulty || 'medium'
      };
    });
  }

  /**
   * Get AI coaching history
   */
  private static async getAIHistory(
    userId: string, 
    days: number
  ): Promise<AIContext['aiHistory']> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      collection(db, 'aiCoachLogs'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        recommendation: data.recommendation,
        accepted: data.accepted || false,
        effectiveness: data.effectiveness || 0,
        timestamp: data.timestamp.toDate().toISOString()
      };
    });
  }

  /**
   * Get detailed activity data for pattern analysis
   */
  private static async getDetailedActivityData(
    userId: string, 
    days: number
  ): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      collection(db, 'progressLogs'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        timestamp: data.timestamp.toDate(),
        subjectId: data.subjectId,
        xpEarned: data.xpEarned,
        timeSpent: data.metadata?.timeSpent || 0,
        isCorrect: data.metadata?.isCorrect !== false
      };
    });
  }

  /**
   * Calculate session frequency
   */
  private static calculateSessionFrequency(activityData: any[]): number {
    if (activityData.length === 0) return 0;
    
    const sessionsPerDay = activityData.length / 30; // Last 30 days
    return Math.round(sessionsPerDay * 10) / 10;
  }

  /**
   * Identify drop-off points
   */
  private static identifyDropOffPoints(activityData: any[]): string[] {
    const dropOffPoints: string[] = [];
    const subjectActivity = new Map<string, number>();
    
    // Count activity by subject
    for (const activity of activityData) {
      const count = subjectActivity.get(activity.subjectId) || 0;
      subjectActivity.set(activity.subjectId, count + 1);
    }
    
    // Find subjects with declining activity
    for (const [subject, count] of subjectActivity.entries()) {
      if (count < 5) { // Less than 5 activities in 30 days
        dropOffPoints.push(subject);
      }
    }
    
    return dropOffPoints;
  }

  /**
   * Identify peak study hours
   */
  private static identifyPeakHours(activityData: any[]): number[] {
    const hourCounts = new Map<number, number>();
    
    for (const activity of activityData) {
      const hour = activity.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    
    // Get top 3 hours
    return Array.from(hourCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  /**
   * Analyze study pattern
   */
  private static analyzeStudyPattern(activityData: any[]): AIContext['behavior']['studyPattern'] {
    if (activityData.length < 5) return 'irregular';
    
    // Group by day
    const dailyActivity = new Map<string, number>();
    for (const activity of activityData) {
      const date = activity.timestamp.toDateString();
      const count = dailyActivity.get(date) || 0;
      dailyActivity.set(date, count + 1);
    }
    
    const activities = Array.from(dailyActivity.values());
    const avg = activities.reduce((sum, val) => sum + val, 0) / activities.length;
    const variance = activities.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / activities.length;
    const stdDev = Math.sqrt(variance);
    
    // Determine pattern based on consistency
    if (stdDev < 0.5) return 'consistent';
    if (stdDev > 2) return 'irregular';
    
    // Check trend
    const recent = activities.slice(-7);
    const older = activities.slice(0, 7);
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.2) return 'improving';
    if (recentAvg < olderAvg * 0.8) return 'declining';
    
    return 'consistent';
  }

  /**
   * Assess burnout risk
   */
  private static assessBurnoutRisk(
    activityData: any[], 
    analytics: any
  ): AIContext['behavior']['burnoutRisk'] {
    const recentActivity = activityData.filter(a => 
      Date.now() - a.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
    );
    
    const avgSessionLength = analytics?.learningPatterns?.averageSessionLength || 0;
    const consistencyScore = analytics?.learningPatterns?.consistencyScore || 0;
    
    // High risk factors
    const longSessions = avgSessionLength > 60; // > 1 hour sessions
    const lowConsistency = consistencyScore < 30;
    const highFrequency = recentActivity.length > 20; // > 20 sessions/week
    
    if (longSessions && lowConsistency) return 'high';
    if (longSessions || lowConsistency || highFrequency) return 'medium';
    return 'low';
  }

  /**
   * Build metadata section
   */
  private static buildMetadata(
    userProgress: UserProgress, 
    analytics: any, 
    recentActivity: any[]
  ): AIContext['metadata'] {
    // Calculate data completeness
    let completeness = 0;
    if (userProgress) completeness += 30;
    if (analytics) completeness += 30;
    if (recentActivity.length > 0) completeness += 20;
    if (Object.keys(userProgress.subjects).length > 0) completeness += 20;
    
    // Calculate confidence based on data quality
    const confidenceLevel = Math.min(
      completeness,
      Math.min(recentActivity.length * 5, 100)
    );
    
    return {
      generatedAt: new Date().toISOString(),
      dataCompleteness: completeness,
      confidenceLevel
    };
  }

  /**
   * Get default behavior section
   */
  private static getDefaultBehavior(): AIContext['behavior'] {
    return {
      dailyUsageMinutes: 0,
      consistencyScore: 0,
      sessionFrequency: 0,
      dropOffPoints: [],
      peakHours: [],
      studyPattern: 'irregular',
      burnoutRisk: 'low'
    };
  }

  /**
   * Get user progress data
   */
  private static async getUserProgress(userId: string): Promise<UserProgress | null> {
    const { CachedOperationsManager } = await import('@/app/lib/database/cachedOperations');
    return CachedOperationsManager.getUserProgress(userId);
  }

  /**
   * Get user analytics data
   */
  private static async getUserAnalytics(userId: string): Promise<any> {
    const { CachedOperationsManager } = await import('@/app/lib/database/cachedOperations');
    return CachedOperationsManager.getUserAnalytics(userId);
  }
}

export default AIContextEngine;
