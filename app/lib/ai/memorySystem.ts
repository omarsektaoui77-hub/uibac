// AI Memory System
// Tracks user interactions with AI recommendations for continuous learning

import { AIRecommendation } from './decisionEngine';
import { AIContext } from './contextEngine';
import { db } from '@/app/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, getDoc, setDoc, doc, Timestamp } from 'firebase/firestore';

export interface AIMemoryEntry {
  id: string;
  userId: string;
  timestamp: Timestamp;
  recommendation: AIRecommendation;
  context: Partial<AIContext>;
  userAction: 'accepted' | 'rejected' | 'modified' | 'ignored';
  actualOutcome?: {
    subjectStudied: string;
    duration: number;
    xpEarned: number;
    accuracy: number;
    satisfaction: number; // 1-5 rating
  };
  effectiveness: number; // 0-1 calculated score
  feedback?: {
    helpful: boolean;
    relevant: boolean;
    difficulty: 'too_easy' | 'just_right' | 'too_hard';
    comments?: string;
  };
  metadata: {
    model: string;
    confidence: number;
    responseTime: number; // milliseconds
    cached: boolean;
  };
}

export interface MemoryAnalytics {
  totalInteractions: number;
  acceptanceRate: number;
  averageEffectiveness: number;
  subjectPreferences: Record<string, number>;
  difficultyPreferences: Record<string, number>;
  bestPerformingRecommendations: string[];
  improvementAreas: string[];
  modelPerformance: Record<string, number>;
  recentTrends: {
    acceptanceTrend: 'improving' | 'declining' | 'stable';
    effectivenessTrend: 'improving' | 'declining' | 'stable';
    satisfactionTrend: 'improving' | 'declining' | 'stable';
  };
}

/**
 * AI Memory System
 * Tracks and learns from user interactions with AI recommendations
 */
export class AIMemorySystem {
  
  /**
   * Store AI recommendation in memory
   */
  static async storeRecommendation(
    userId: string,
    recommendation: AIRecommendation,
    context: Partial<AIContext>,
    metadata: {
      model: string;
      confidence: number;
      responseTime: number;
      cached: boolean;
    }
  ): Promise<string> {
    try {
      const memoryId = `memory_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const memoryEntry: Omit<AIMemoryEntry, 'id'> = {
        userId,
        timestamp: Timestamp.now(),
        recommendation,
        context,
        userAction: 'ignored', // Default until user takes action
        effectiveness: 0, // Will be calculated later
        metadata
      };

      await setDoc(doc(db, 'aiMemory', memoryId), memoryEntry);
      
      console.log(`AI Memory: Stored recommendation ${memoryId} for user ${userId}`);
      return memoryId;

    } catch (error) {
      console.error('AI Memory store error:', error);
      throw error;
    }
  }

  /**
   * Record user action on recommendation
   */
  static async recordUserAction(
    memoryId: string,
    action: AIMemoryEntry['userAction'],
    outcome?: AIMemoryEntry['actualOutcome'],
    feedback?: AIMemoryEntry['feedback']
  ): Promise<void> {
    try {
      const memoryRef = doc(db, 'aiMemory', memoryId);
      const memorySnap = await getDoc(memoryRef);
      
      if (!memorySnap.exists()) {
        throw new Error('Memory entry not found');
      }

      const memoryData = memorySnap.data() as AIMemoryEntry;
      
      // Calculate effectiveness based on outcome
      let effectiveness = 0;
      if (outcome && action === 'accepted') {
        effectiveness = this.calculateEffectiveness(memoryData.recommendation, outcome);
      }

      // Update memory entry
      const updatedEntry: Partial<AIMemoryEntry> = {
        userAction: action,
        actualOutcome: outcome,
        effectiveness,
        feedback
      };

      await setDoc(memoryRef, updatedEntry, { merge: true });
      
      console.log(`AI Memory: Recorded action ${action} for ${memoryId}`);

    } catch (error) {
      console.error('AI Memory record action error:', error);
      throw error;
    }
  }

  /**
   * Get user's AI memory history
   */
  static async getUserMemory(
    userId: string,
    options: {
      limitCount?: number;
      days?: number;
      includeOutcomes?: boolean;
    } = {}
  ): Promise<AIMemoryEntry[]> {
    try {
      const { limitCount = 50, days = 30, includeOutcomes = true } = options;
      
      let q = query(
        collection(db, 'aiMemory'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(cutoffDate)));
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const memories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AIMemoryEntry[];

      return includeOutcomes ? memories : memories.filter(m => !m.actualOutcome);

    } catch (error) {
      console.error('AI Memory get error:', error);
      return [];
    }
  }

  /**
   * Get memory analytics for user
   */
  static async getMemoryAnalytics(userId: string, days: number = 30): Promise<MemoryAnalytics> {
    try {
      const memories = await this.getUserMemory(userId, { days, limitCount: 100 });
      
      if (memories.length === 0) {
        return this.getDefaultAnalytics();
      }

      // Calculate basic metrics
      const totalInteractions = memories.length;
      const acceptedCount = memories.filter(m => m.userAction === 'accepted').length;
      const acceptanceRate = (acceptedCount / totalInteractions) * 100;
      
      const outcomesWithEffectiveness = memories.filter(m => m.effectiveness > 0);
      const averageEffectiveness = outcomesWithEffectiveness.length > 0
        ? outcomesWithEffectiveness.reduce((sum, m) => sum + m.effectiveness, 0) / outcomesWithEffectiveness.length
        : 0;

      // Calculate subject preferences
      const subjectPreferences: Record<string, number> = {};
      const subjectOutcomes: Record<string, number[]> = {};
      
      for (const memory of memories) {
        const subject = memory.recommendation.focus_subject;
        if (!subjectPreferences[subject]) {
          subjectPreferences[subject] = 0;
          subjectOutcomes[subject] = [];
        }
        
        if (memory.userAction === 'accepted') {
          subjectPreferences[subject]++;
        }
        
        if (memory.effectiveness > 0) {
          subjectOutcomes[subject].push(memory.effectiveness);
        }
      }

      // Calculate difficulty preferences
      const difficultyPreferences: Record<string, number> = {};
      const difficultyOutcomes: Record<string, number[]> = {};
      
      for (const memory of memories) {
        const difficulty = memory.recommendation.difficulty;
        if (!difficultyPreferences[difficulty]) {
          difficultyPreferences[difficulty] = 0;
          difficultyOutcomes[difficulty] = [];
        }
        
        if (memory.userAction === 'accepted') {
          difficultyPreferences[difficulty]++;
        }
        
        if (memory.effectiveness > 0) {
          difficultyOutcomes[difficulty].push(memory.effectiveness);
        }
      }

      // Find best performing recommendations
      const bestPerforming = memories
        .filter(m => m.effectiveness > 0.7)
        .sort((a, b) => b.effectiveness - a.effectiveness)
        .slice(0, 5)
        .map(m => m.recommendation.study_plan);

      // Identify improvement areas
      const improvementAreas = Object.entries(subjectOutcomes)
        .filter(([, outcomes]) => outcomes.length > 0)
        .map(([subject, outcomes]) => ({
          subject,
          avgEffectiveness: outcomes.reduce((sum, val) => sum + val, 0) / outcomes.length
        }))
        .sort((a, b) => a.avgEffectiveness - b.avgEffectiveness)
        .slice(0, 3)
        .map(item => item.subject);

      // Calculate model performance
      const modelPerformance: Record<string, number> = {};
      const modelOutcomes: Record<string, number[]> = {};
      
      for (const memory of memories) {
        const model = memory.metadata.model;
        if (!modelPerformance[model]) {
          modelPerformance[model] = 0;
          modelOutcomes[model] = [];
        }
        
        if (memory.userAction === 'accepted') {
          modelPerformance[model]++;
        }
        
        if (memory.effectiveness > 0) {
          modelOutcomes[model].push(memory.effectiveness);
        }
      }

      // Calculate trends
      const recentMemories = memories.slice(0, 10); // Last 10 interactions
      const olderMemories = memories.slice(10, 20); // Previous 10 interactions
      
      const recentAcceptance = recentMemories.filter(m => m.userAction === 'accepted').length / recentMemories.length;
      const olderAcceptance = olderMemories.filter(m => m.userAction === 'accepted').length / olderMemories.length;
      
      const recentEffectiveness = recentMemories.reduce((sum, m) => sum + m.effectiveness, 0) / recentMemories.length;
      const olderEffectiveness = olderMemories.reduce((sum, m) => sum + m.effectiveness, 0) / olderMemories.length;

      const recentSatisfaction = recentMemories
        .filter(m => m.actualOutcome?.satisfaction)
        .reduce((sum, m) => sum + (m.actualOutcome?.satisfaction || 0), 0) / recentMemories.length;

      return {
        totalInteractions,
        acceptanceRate,
        averageEffectiveness,
        subjectPreferences,
        difficultyPreferences,
        bestPerformingRecommendations: bestPerforming,
        improvementAreas,
        modelPerformance,
        recentTrends: {
          acceptanceTrend: this.calculateTrend(recentAcceptance, olderAcceptance),
          effectivenessTrend: this.calculateTrend(recentEffectiveness, olderEffectiveness),
          satisfactionTrend: this.calculateTrend(recentSatisfaction, 0) // No older satisfaction data
        }
      };

    } catch (error) {
      console.error('AI Memory analytics error:', error);
      return this.getDefaultAnalytics();
    }
  }

  /**
   * Calculate recommendation effectiveness
   */
  private static calculateEffectiveness(
    recommendation: AIRecommendation,
    outcome: AIMemoryEntry['actualOutcome']
  ): number {
    if (!outcome) return 0;

    let effectiveness = 0;

    // Subject alignment (40%)
    if (outcome.subjectStudied === recommendation.focus_subject) {
      effectiveness += 0.4;
    }

    // Duration alignment (20%)
    const durationDiff = Math.abs(outcome.duration - recommendation.estimated_duration);
    const durationAlignment = Math.max(0, 1 - (durationDiff / recommendation.estimated_duration));
    effectiveness += durationAlignment * 0.2;

    // XP achievement (20%)
    const xpAlignment = Math.min(outcome.xpEarned / recommendation.expected_xp, 1);
    effectiveness += xpAlignment * 0.2;

    // Accuracy improvement (20%)
    if (outcome.accuracy >= 70) {
      effectiveness += 0.2;
    } else if (outcome.accuracy >= 50) {
      effectiveness += 0.1;
    }

    return Math.min(effectiveness, 1);
  }

  /**
   * Calculate trend between two values
   */
  private static calculateTrend(recent: number, older: number): 'improving' | 'declining' | 'stable' {
    const diff = recent - older;
    const threshold = 0.1; // 10% change threshold

    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }

  /**
   * Get default analytics
   */
  private static getDefaultAnalytics(): MemoryAnalytics {
    return {
      totalInteractions: 0,
      acceptanceRate: 0,
      averageEffectiveness: 0,
      subjectPreferences: {},
      difficultyPreferences: {},
      bestPerformingRecommendations: [],
      improvementAreas: [],
      modelPerformance: {},
      recentTrends: {
        acceptanceTrend: 'stable',
        effectivenessTrend: 'stable',
        satisfactionTrend: 'stable'
      }
    };
  }

  /**
   * Get insights for AI improvement
   */
  static async getInsights(userId: string): Promise<{
    recommendations: string[];
    modelAdjustments: Record<string, any>;
    userPatterns: string[];
  }> {
    try {
      const analytics = await this.getMemoryAnalytics(userId);
      const insights = {
        recommendations: [] as string[],
        modelAdjustments: {} as Record<string, any>,
        userPatterns: [] as string[]
      };

      // Generate recommendations based on analytics
      if (analytics.acceptanceRate < 40) {
        insights.recommendations.push('Consider more personalized recommendations based on user preferences');
        insights.modelAdjustments.temperature = 0.8; // More creative
      }

      if (analytics.averageEffectiveness < 0.5) {
        insights.recommendations.push('Focus on subjects with higher historical effectiveness');
        insights.modelAdjustments.confidence_threshold = 0.8; // Higher confidence threshold
      }

      // Subject preference insights
      const preferredSubjects = Object.entries(analytics.subjectPreferences)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([subject]) => subject);

      if (preferredSubjects.length > 0) {
        insights.userPatterns.push(`User prefers studying: ${preferredSubjects.join(', ')}`);
        insights.modelAdjustments.preferred_subjects = preferredSubjects;
      }

      // Difficulty preference insights
      const preferredDifficulty = Object.entries(analytics.difficultyPreferences)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      if (preferredDifficulty) {
        insights.userPatterns.push(`User prefers ${preferredDifficulty} difficulty`);
        insights.modelAdjustments.preferred_difficulty = preferredDifficulty;
      }

      // Model performance insights
      const bestModel = Object.entries(analytics.modelPerformance)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      if (bestModel) {
        insights.modelAdjustments.preferred_model = bestModel;
      }

      return insights;

    } catch (error) {
      console.error('AI Memory insights error:', error);
      return {
        recommendations: [],
        modelAdjustments: {},
        userPatterns: []
      };
    }
  }

  /**
   * Clean up old memory entries
   */
  static async cleanupOldEntries(days: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const q = query(
        collection(db, 'aiMemory'),
        where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => 
        setDoc(doc.ref, { deleted: true }, { merge: true })
      );

      await Promise.all(deletePromises);
      
      console.log(`AI Memory: Cleaned up ${querySnapshot.size} old entries`);
      return querySnapshot.size;

    } catch (error) {
      console.error('AI Memory cleanup error:', error);
      return 0;
    }
  }

  /**
   * Export memory data for analysis
   */
  static async exportMemoryData(
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const memories = await this.getUserMemory(userId, { days: 90, limitCount: 1000 });
      
      if (format === 'csv') {
        const headers = [
          'timestamp', 'focus_subject', 'reason', 'study_plan', 'motivation',
          'difficulty', 'confidence', 'user_action', 'effectiveness',
          'duration', 'xp_earned', 'accuracy', 'satisfaction'
        ];
        
        const csvRows = [
          headers.join(','),
          ...memories.map(m => [
            m.timestamp.toDate().toISOString(),
            m.recommendation.focus_subject,
            `"${m.recommendation.reason}"`,
            `"${m.recommendation.study_plan}"`,
            `"${m.recommendation.motivation}"`,
            m.recommendation.difficulty,
            m.recommendation.confidence,
            m.userAction,
            m.effectiveness,
            m.actualOutcome?.duration || '',
            m.actualOutcome?.xpEarned || '',
            m.actualOutcome?.accuracy || '',
            m.actualOutcome?.satisfaction || ''
          ].join(','))
        ];
        
        return csvRows.join('\n');
      }

      return JSON.stringify(memories, null, 2);

    } catch (error) {
      console.error('AI Memory export error:', error);
      throw error;
    }
  }
}

export default AIMemorySystem;
