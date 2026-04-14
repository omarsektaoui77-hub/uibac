// Progress Analytics System
// Comprehensive logging for AI insights and behavioral analysis

import { db } from '@/app/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

export interface ProgressLog {
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
    questionId?: string;
    topicId?: string;
  };
}

export interface UserAnalytics {
  userId: string;
  totalXP: number;
  totalStudyTime: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  subjectPerformance: Record<string, {
    xp: number;
    accuracy: number;
    streak: number;
    questionsAnswered: number;
    timeSpent: number;
  }>;
  learningPatterns: {
    mostActiveHour: number;
    averageSessionLength: number;
    preferredDifficulty: string;
    consistencyScore: number;
  };
  weeklyProgress: Array<{
    week: string;
    xpEarned: number;
    studyTime: number;
    activitiesCompleted: number;
  }>;
  lastUpdated: Timestamp;
}

export interface LearningInsight {
  type: 'strength' | 'weakness' | 'pattern' | 'recommendation' | 'achievement';
  subjectId?: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  data: any;
  generatedAt: Timestamp;
  expiresAt: Timestamp;
}

/**
 * Progress Analytics Manager
 * Tracks user behavior and generates AI insights
 */
export class ProgressAnalytics {
  /**
   * Log progress activity
   */
  static async logProgress(log: ProgressLog): Promise<void> {
    try {
      const logId = `${log.userId}_${log.timestamp.toMillis()}`;
      await setDoc(doc(db, 'progressLogs', logId), log);
      
      // Update user analytics asynchronously
      this.updateUserAnalytics(log.userId).catch(error => {
        console.error('Failed to update user analytics:', error);
      });
      
    } catch (error) {
      console.error('Failed to log progress:', error);
    }
  }

  /**
   * Get user progress logs
   */
  static async getProgressLogs(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      subjectId?: string;
      activityType?: string;
      limit?: number;
    } = {}
  ): Promise<ProgressLog[]> {
    try {
      let q = query(collection(db, 'progressLogs'), where('userId', '==', userId));
      
      if (options.subjectId) {
        q = query(q, where('subjectId', '==', options.subjectId));
      }
      
      if (options.activityType) {
        q = query(q, where('activityType', '==', options.activityType));
      }
      
      if (options.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
      }
      
      if (options.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
      }
      
      q = query(q, orderBy('timestamp', 'desc'));
      
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ProgressLog);
      
    } catch (error) {
      console.error('Failed to get progress logs:', error);
      return [];
    }
  }

  /**
   * Update user analytics summary
   */
  static async updateUserAnalytics(userId: string): Promise<void> {
    try {
      // Get recent progress logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const logs = await this.getProgressLogs(userId, {
        startDate: thirtyDaysAgo,
        limit: 10000
      });
      
      if (logs.length === 0) return;
      
      // Calculate analytics
      const analytics = this.calculateAnalytics(userId, logs);
      
      // Save to database
      await setDoc(doc(db, 'userAnalytics', userId), analytics);
      
    } catch (error) {
      console.error('Failed to update user analytics:', error);
    }
  }

  /**
   * Calculate analytics from progress logs
   */
  private static calculateAnalytics(userId: string, logs: ProgressLog[]): UserAnalytics {
    // Basic metrics
    const totalXP = logs.reduce((sum, log) => sum + log.xpEarned, 0);
    const totalStudyTime = logs.reduce((sum, log) => sum + (log.metadata.timeSpent || 0), 0);
    const correctAnswers = logs.filter(log => log.metadata.isCorrect !== false).length;
    const averageAccuracy = logs.length > 0 ? (correctAnswers / logs.length) * 100 : 0;
    
    // Subject performance
    const subjectPerformance: Record<string, any> = {};
    const subjectLogs = new Map<string, ProgressLog[]>();
    
    for (const log of logs) {
      if (log.subjectId) {
        if (!subjectLogs.has(log.subjectId)) {
          subjectLogs.set(log.subjectId, []);
        }
        subjectLogs.get(log.subjectId)!.push(log);
      }
    }
    
    for (const [subjectId, subjectLogList] of subjectLogs.entries()) {
      const subjectXP = subjectLogList.reduce((sum, log) => sum + log.xpEarned, 0);
      const subjectCorrect = subjectLogList.filter(log => log.metadata.isCorrect !== false).length;
      const subjectAccuracy = subjectLogList.length > 0 ? (subjectCorrect / subjectLogList.length) * 100 : 0;
      const subjectTime = subjectLogList.reduce((sum, log) => sum + (log.metadata.timeSpent || 0), 0);
      
      subjectPerformance[subjectId] = {
        xp: subjectXP,
        accuracy: subjectAccuracy,
        streak: 0, // Would be calculated from streak data
        questionsAnswered: subjectLogList.length,
        timeSpent: subjectTime
      };
    }
    
    // Learning patterns
    const learningPatterns = this.calculateLearningPatterns(logs);
    
    // Weekly progress
    const weeklyProgress = this.calculateWeeklyProgress(logs);
    
    return {
      userId,
      totalXP,
      totalStudyTime,
      averageAccuracy,
      currentStreak: 0, // Would be calculated from user data
      longestStreak: 0, // Would be calculated from user data
      subjectPerformance,
      learningPatterns,
      weeklyProgress,
      lastUpdated: Timestamp.now()
    };
  }

  /**
   * Calculate learning patterns
   */
  private static calculateLearningPatterns(logs: ProgressLog[]): UserAnalytics['learningPatterns'] {
    if (logs.length === 0) {
      return {
        mostActiveHour: 12,
        averageSessionLength: 0,
        preferredDifficulty: 'medium',
        consistencyScore: 0
      };
    }
    
    // Most active hour
    const hourCounts = new Map<number, number>();
    for (const log of logs) {
      const hour = log.timestamp.toDate().getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    
    const mostActiveHour = Array.from(hourCounts.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 12;
    
    // Average session length (by session ID)
    const sessionLengths = new Map<string, number>();
    for (const log of logs) {
      const sessionId = log.metadata.sessionId || 'default';
      const time = log.metadata.timeSpent || 0;
      sessionLengths.set(sessionId, (sessionLengths.get(sessionId) || 0) + time);
    }
    
    const averageSessionLength = sessionLengths.size > 0
      ? Array.from(sessionLengths.values()).reduce((sum, length) => sum + length, 0) / sessionLengths.size
      : 0;
    
    // Preferred difficulty
    const difficultyCounts = new Map<string, number>();
    for (const log of logs) {
      const difficulty = log.metadata.difficulty || 'medium';
      difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) || 0) + 1);
    }
    
    const preferredDifficulty = Array.from(difficultyCounts.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'medium';
    
    // Consistency score (based on daily activity)
    const dailyActivity = new Map<string, number>();
    for (const log of logs) {
      const date = log.timestamp.toDate().toDateString();
      dailyActivity.set(date, (dailyActivity.get(date) || 0) + 1);
    }
    
    const activeDays = dailyActivity.size;
    const totalDays = Math.ceil((Date.now() - logs[logs.length - 1].timestamp.toMillis()) / (1000 * 60 * 60 * 24));
    const consistencyScore = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;
    
    return {
      mostActiveHour,
      averageSessionLength,
      preferredDifficulty,
      consistencyScore
    };
  }

  /**
   * Calculate weekly progress
   */
  private static calculateWeeklyProgress(logs: ProgressLog[]): UserAnalytics['weeklyProgress'] {
    const weeklyData = new Map<string, { xp: number; time: number; activities: number }>();
    
    for (const log of logs) {
      const date = log.timestamp.toDate();
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { xp: 0, time: 0, activities: 0 });
      }
      
      const weekData = weeklyData.get(weekKey)!;
      weekData.xp += log.xpEarned;
      weekData.time += log.metadata.timeSpent || 0;
      weekData.activities += 1;
    }
    
    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({
        week,
        xpEarned: data.xp,
        studyTime: data.time,
        activitiesCompleted: data.activities
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  /**
   * Get user analytics
   */
  static async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    try {
      const docRef = doc(db, 'userAnalytics', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserAnalytics;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      return null;
    }
  }

  /**
   * Generate learning insights
   */
  static async generateInsights(userId: string): Promise<LearningInsight[]> {
    try {
      const analytics = await this.getUserAnalytics(userId);
      if (!analytics) return [];
      
      const insights: LearningInsight[] = [];
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Weakness insights
      const subjectEntries = Object.entries(analytics.subjectPerformance);
      if (subjectEntries.length > 0) {
        const weakestSubject = subjectEntries.sort(([, a], [, b]) => a.xp - b.xp)[0];
        const strongestSubject = subjectEntries.sort(([, a], [, b]) => b.xp - a.xp)[0];
        
        insights.push({
          type: 'weakness',
          subjectId: weakestSubject[0],
          title: 'Focus Area Identified',
          description: `You're doing great in most subjects, but ${weakestSubject[0]} needs more attention.`,
          confidence: 85,
          data: {
            subjectPerformance: weakestSubject[1],
            averageXP: subjectEntries.reduce((sum, [, perf]) => sum + perf.xp, 0) / subjectEntries.length
          },
          generatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt)
        });
        
        insights.push({
          type: 'strength',
          subjectId: strongestSubject[0],
          title: 'Strength Area Identified',
          description: `You excel in ${strongestSubject[0]}! Keep leveraging this strength.`,
          confidence: 90,
          data: {
            subjectPerformance: strongestSubject[1]
          },
          generatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt)
        });
      }
      
      // Pattern insights
      if (analytics.learningPatterns.consistencyScore < 50) {
        insights.push({
          type: 'pattern',
          title: 'Inconsistent Study Pattern',
          description: 'Your study schedule could be more consistent. Try to study at the same time each day.',
          confidence: 75,
          data: {
            consistencyScore: analytics.learningPatterns.consistencyScore,
            mostActiveHour: analytics.learningPatterns.mostActiveHour
          },
          generatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt)
        });
      }
      
      // Recommendation insights
      if (analytics.averageAccuracy < 70) {
        insights.push({
          type: 'recommendation',
          title: 'Accuracy Improvement Needed',
          description: 'Focus on understanding concepts rather than speed through questions.',
          confidence: 80,
          data: {
            currentAccuracy: analytics.averageAccuracy,
            targetAccuracy: 85
          },
          generatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt)
        });
      }
      
      // Achievement insights
      if (analytics.totalXP >= 1000) {
        insights.push({
          type: 'achievement',
          title: 'Milestone Reached',
          description: `You've earned ${analytics.totalXP} XP! Great dedication to your learning journey.`,
          confidence: 100,
          data: {
            totalXP: analytics.totalXP,
            milestone: '1000 XP'
          },
          generatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt)
        });
      }
      
      // Save insights to database
      for (const insight of insights) {
        const insightId = `${userId}_${insight.type}_${Date.now()}`;
        await setDoc(doc(db, 'learningInsights', insightId), insight);
      }
      
      return insights;
      
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return [];
    }
  }

  /**
   * Get user insights
   */
  static async getUserInsights(userId: string, limitCount: number = 10): Promise<LearningInsight[]> {
    try {
      const q = query(
        collection(db, 'learningInsights'),
        where('userId', '==', userId),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('generatedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as LearningInsight);
      
    } catch (error) {
      console.error('Failed to get user insights:', error);
      return [];
    }
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(
    type: 'xp' | 'level' | 'streak' | 'accuracy',
    subjectId?: string,
    limitCount: number = 50
  ): Promise<Array<{
    userId: string;
    value: number;
    rank: number;
    metadata?: any;
  }>> {
    try {
      // This would typically use a more efficient query with proper indexing
      const q = query(
        collection(db, 'userAnalytics'),
        limit(limitCount * 2) // Get more to allow for filtering
      );

      const querySnapshot = await getDocs(q);
      const analytics = querySnapshot.docs.map(doc => doc.data() as UserAnalytics);

      // Filter and sort based on type
      let sortedAnalytics = analytics;

      switch (type) {
        case 'xp':
          sortedAnalytics = analytics.sort((a, b) => b.totalXP - a.totalXP);
          break;
        case 'accuracy':
          sortedAnalytics = analytics.sort((a, b) => b.averageAccuracy - a.averageAccuracy);
          break;
        case 'streak':
          sortedAnalytics = analytics.sort((a, b) => b.currentStreak - a.currentStreak);
          break;
      }

      // Filter by subject if specified
      if (subjectId) {
        sortedAnalytics = sortedAnalytics.filter(a => a.subjectPerformance[subjectId]);
      }

      // Create leaderboard
      return sortedAnalytics.slice(0, limitCount).map((analytics, index) => ({
        userId: analytics.userId,
        value: type === 'xp' ? analytics.totalXP :
               type === 'accuracy' ? analytics.averageAccuracy :
               type === 'streak' ? analytics.currentStreak :
               (subjectId && analytics.subjectPerformance[subjectId] && typeof analytics.subjectPerformance[subjectId] === 'object' && 'xp' in analytics.subjectPerformance[subjectId]) ? analytics.subjectPerformance[subjectId].xp : 0,
        rank: index + 1,
        metadata: {
          subjectPerformance: analytics.subjectPerformance,
          learningPatterns: analytics.learningPatterns
        }
      }));
      
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Clean up expired insights
   */
  static async cleanupExpiredInsights(): Promise<void> {
    try {
      const q = query(
        collection(db, 'learningInsights'),
        where('expiresAt', '<=', Timestamp.now())
      );
      
      const querySnapshot = await getDocs(q);
      const batch = querySnapshot.docs.map(doc => doc.ref);
      
      // In production, use batch delete
      for (const docRef of batch) {
        await deleteDoc(docRef);
      }
      
      console.log(`Cleaned up ${batch.length} expired insights`);
      
    } catch (error) {
      console.error('Failed to cleanup expired insights:', error);
    }
  }
}

export default ProgressAnalytics;
