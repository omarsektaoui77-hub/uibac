// AI Feedback Loop System
// Continuous improvement of AI recommendations based on user behavior

import { AIMemorySystem, MemoryAnalytics } from './memorySystem';
import { AIRecommendation } from './decisionEngine';
import { AIContext } from './contextEngine';
import { AICacheManager } from './aiCache';
import { AIDecisionEngine } from './decisionEngine';

export interface FeedbackData {
  userId: string;
  memoryId: string;
  userAction: 'accepted' | 'rejected' | 'modified' | 'ignored';
  actualOutcome: {
    subjectStudied: string;
    duration: number;
    xpEarned: number;
    accuracy: number;
    satisfaction: number; // 1-5 rating
    timestamp: string;
  };
  feedback: {
    helpful: boolean;
    relevant: boolean;
    difficulty: 'too_easy' | 'just_right' | 'too_hard';
    comments?: string;
  };
  performanceMetrics: {
    improvementRate: number;
    adherenceRate: number;
    effectivenessScore: number;
  };
}

export interface FeedbackInsights {
  userPatterns: {
    preferredSubjects: string[];
    preferredDifficulty: string;
    optimalStudyDuration: number;
    peakPerformanceTimes: string[];
  };
  aiPerformance: {
    modelAccuracy: number;
    recommendationQuality: number;
    personalizationLevel: number;
    improvementSuggestions: string[];
  };
  adaptiveAdjustments: {
    promptModifications: Record<string, any>;
    modelPreferences: Record<string, number>;
    contextWeighting: Record<string, number>;
  };
}

/**
 * AI Feedback Loop System
 * Continuously improves AI recommendations through user feedback
 */
export class AIFeedbackLoop {
  
  /**
   * Process user feedback and update AI systems
   */
  static async processFeedback(feedbackData: FeedbackData): Promise<{
    success: boolean;
    insights: FeedbackInsights;
    adjustments: Record<string, any>;
  }> {
    try {
      // Record user action in memory
      await AIMemorySystem.recordUserAction(
        feedbackData.memoryId,
        feedbackData.userAction,
        feedbackData.actualOutcome,
        feedbackData.feedback
      );

      // Update cache effectiveness
      const context = await this.buildContextFromFeedback(feedbackData);
      await AICacheManager.updateEffectiveness(
        feedbackData.userId,
        context,
        feedbackData.performanceMetrics.effectivenessScore
      );

      // Generate insights from feedback
      const insights = await this.generateInsights(feedbackData);

      // Apply adaptive adjustments
      const adjustments = await this.applyAdaptiveAdjustments(feedbackData, insights);

      return {
        success: true,
        insights,
        adjustments
      };

    } catch (error) {
      console.error('Feedback Loop error:', error);
      return {
        success: false,
        insights: this.getDefaultInsights(),
        adjustments: {}
      };
    }
  }

  /**
   * Get feedback analytics for user
   */
  static async getFeedbackAnalytics(
    userId: string,
    days: number = 30
  ): Promise<{
    analytics: MemoryAnalytics;
    insights: FeedbackInsights;
    trends: {
      improvementTrend: 'improving' | 'declining' | 'stable';
      satisfactionTrend: 'improving' | 'declining' | 'stable';
      adherenceTrend: 'improving' | 'declining' | 'stable';
    };
  }> {
    try {
      const analytics = await AIMemorySystem.getMemoryAnalytics(userId, days);
      const insights = await this.generateInsightsFromAnalytics(analytics);
      
      const trends = this.calculateTrends(analytics);

      return {
        analytics,
        insights,
        trends
      };

    } catch (error) {
      console.error('Feedback analytics error:', error);
      return {
        analytics: AIMemorySystem['getDefaultAnalytics'](),
        insights: this.getDefaultInsights(),
        trends: {
          improvementTrend: 'stable',
          satisfactionTrend: 'stable',
          adherenceTrend: 'stable'
        }
      };
    }
  }

  /**
   * Auto-improve AI prompts based on feedback
   */
  static async autoImprovePrompts(userId: string): Promise<{
    improvements: Record<string, any>;
    confidence: number;
  }> {
    try {
      const { analytics, insights } = await this.getFeedbackAnalytics(userId);
      const improvements: Record<string, any> = {};
      let confidence = 0.5;

      // Improve based on acceptance rate
      if (analytics.acceptanceRate < 50) {
        improvements.personalization = {
          level: 'high',
          includeRecentPerformance: true,
          emphasizeStrengths: true
        };
        confidence += 0.2;
      }

      // Improve based on effectiveness
      if (analytics.averageEffectiveness < 0.6) {
        improvements.difficulty_adjustment = {
          conservative: true,
          gradualProgression: true
        };
        confidence += 0.2;
      }

      // Improve based on subject preferences
      if (Object.keys(insights.userPatterns.preferredSubjects).length > 0) {
        improvements.subject_weighting = insights.userPatterns.preferredSubjects.reduce((acc, subject) => {
          acc[subject] = analytics.subjectPreferences[subject] || 1.0;
          return acc;
        }, {});
        confidence += 0.1;
      }

      // Improve based on optimal duration
      if (insights.userPatterns.optimalStudyDuration) {
        improvements.duration_targeting = {
          preferred: insights.userPatterns.optimalStudyDuration,
          flexibility: 10 // minutes
        };
        confidence += 0.1;
      }

      return {
        improvements,
        confidence: Math.min(confidence, 1.0)
      };

    } catch (error) {
      console.error('Auto-improve prompts error:', error);
      return {
        improvements: {},
        confidence: 0
      };
    }
  }

  /**
   * Generate insights from feedback data
   */
  private static async generateInsights(
    feedbackData: FeedbackData
  ): Promise<FeedbackInsights> {
    try {
      const memoryAnalytics = await AIMemorySystem.getMemoryAnalytics(feedbackData.userId);
      
      // Analyze user patterns
      const userPatterns = {
        preferredSubjects: this.getPreferredSubjects(memoryAnalytics),
        preferredDifficulty: this.getPreferredDifficulty(memoryAnalytics),
        optimalStudyDuration: this.getOptimalStudyDuration(memoryAnalytics),
        peakPerformanceTimes: this.getPeakPerformanceTimes(memoryAnalytics)
      };

      // Analyze AI performance
      const aiPerformance = {
        modelAccuracy: this.calculateModelAccuracy(memoryAnalytics),
        recommendationQuality: this.calculateRecommendationQuality(memoryAnalytics),
        personalizationLevel: this.calculatePersonalizationLevel(memoryAnalytics),
        improvementSuggestions: this.generateImprovementSuggestions(memoryAnalytics)
      };

      // Generate adaptive adjustments
      const adaptiveAdjustments = await this.generateAdaptiveAdjustments(
        feedbackData,
        userPatterns,
        aiPerformance
      );

      return {
        userPatterns,
        aiPerformance,
        adaptiveAdjustments
      };

    } catch (error) {
      console.error('Generate insights error:', error);
      return this.getDefaultInsights();
    }
  }

  /**
   * Generate insights from analytics
   */
  private static async generateInsightsFromAnalytics(
    analytics: MemoryAnalytics
  ): Promise<FeedbackInsights> {
    return {
      userPatterns: {
        preferredSubjects: Object.entries(analytics.subjectPreferences)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([subject]) => subject),
        preferredDifficulty: Object.entries(analytics.difficultyPreferences)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'medium',
        optimalStudyDuration: 30, // Default, would be calculated from actual data
        peakPerformanceTimes: ['09:00', '14:00', '19:00'] // Default
      },
      aiPerformance: {
        modelAccuracy: analytics.acceptanceRate / 100,
        recommendationQuality: analytics.averageEffectiveness,
        personalizationLevel: this.calculatePersonalizationLevel(analytics),
        improvementSuggestions: analytics.improvementAreas
      },
      adaptiveAdjustments: {
        promptModifications: {},
        modelPreferences: analytics.modelPerformance,
        contextWeighting: {}
      }
    };
  }

  /**
   * Apply adaptive adjustments to AI systems
   */
  private static async applyAdaptiveAdjustments(
    feedbackData: FeedbackData,
    insights: FeedbackInsights
  ): Promise<Record<string, any>> {
    const adjustments: Record<string, any> = {};

    // Adjust model preferences
    if (insights.aiPerformance.modelAccuracy < 0.7) {
      adjustments.model_switch = {
        from: 'current',
        to: 'fallback',
        reason: 'Low accuracy detected'
      };
    }

    // Adjust personalization level
    if (insights.aiPerformance.personalizationLevel < 0.6) {
      adjustments.personalization_boost = {
        level: 'high',
        includeUserHistory: true,
        weightRecentPerformance: 0.3
      };
    }

    // Adjust difficulty preferences
    if (feedbackData.feedback.difficulty === 'too_hard') {
      adjustments.difficulty_adjustment = {
        direction: 'easier',
        amount: 0.2
      };
    } else if (feedbackData.feedback.difficulty === 'too_easy') {
      adjustments.difficulty_adjustment = {
        direction: 'harder',
        amount: 0.2
      };
    }

    // Adjust duration targeting
    const durationDiff = feedbackData.actualOutcome.duration - 30; // Assuming 30 min default
    if (Math.abs(durationDiff) > 10) {
      adjustments.duration_adjustment = {
        target: feedbackData.actualOutcome.duration,
        confidence: 0.8
      };
    }

    return adjustments;
  }

  /**
   * Get preferred subjects from analytics
   */
  private static getPreferredSubjects(analytics: MemoryAnalytics): string[] {
    return Object.entries(analytics.subjectPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([subject]) => subject);
  }

  /**
   * Get preferred difficulty from analytics
   */
  private static getPreferredDifficulty(analytics: MemoryAnalytics): string {
    return Object.entries(analytics.difficultyPreferences)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'medium';
  }

  /**
   * Get optimal study duration from analytics
   */
  private static getOptimalStudyDuration(analytics: MemoryAnalytics): number {
    // This would be calculated from actual outcome data
    // For now, return a reasonable default
    return 30;
  }

  /**
   * Get peak performance times from analytics
   */
  private static getPeakPerformanceTimes(analytics: MemoryAnalytics): string[] {
    // This would be calculated from actual performance timestamps
    // For now, return reasonable defaults
    return ['09:00', '14:00', '19:00'];
  }

  /**
   * Calculate model accuracy
   */
  private static calculateModelAccuracy(analytics: MemoryAnalytics): number {
    return analytics.acceptanceRate / 100;
  }

  /**
   * Calculate recommendation quality
   */
  private static calculateRecommendationQuality(analytics: MemoryAnalytics): number {
    return analytics.averageEffectiveness;
  }

  /**
   * Calculate personalization level
   */
  private static calculatePersonalizationLevel(analytics: MemoryAnalytics): number {
    // Based on how well recommendations match user preferences
    const subjectPreferenceScore = Math.max(...Object.values(analytics.subjectPreferences)) / 10;
    const difficultyPreferenceScore = Math.max(...Object.values(analytics.difficultyPreferences)) / 10;
    
    return (subjectPreferenceScore + difficultyPreferenceScore) / 2;
  }

  /**
   * Generate improvement suggestions
   */
  private static generateImprovementSuggestions(analytics: MemoryAnalytics): string[] {
    const suggestions: string[] = [];

    if (analytics.acceptanceRate < 50) {
      suggestions.push('Increase personalization based on user preferences');
    }

    if (analytics.averageEffectiveness < 0.6) {
      suggestions.push('Focus on subjects with higher historical effectiveness');
    }

    if (analytics.recentTrends.acceptanceTrend === 'declining') {
      suggestions.push('Review recent recommendation patterns');
    }

    return suggestions;
  }

  /**
   * Generate adaptive adjustments
   */
  private static async generateAdaptiveAdjustments(
    feedbackData: FeedbackData,
    userPatterns: FeedbackInsights['userPatterns'],
    aiPerformance: FeedbackInsights['aiPerformance']
  ): Promise<FeedbackInsights['adaptiveAdjustments']> {
    return {
      promptModifications: {
        includePreferredSubjects: userPatterns.preferredSubjects,
        targetDifficulty: userPatterns.preferredDifficulty,
        optimalDuration: userPatterns.optimalStudyDuration
      },
      modelPreferences: {
        primary: 'openai',
        fallback: 'gemini'
      },
      contextWeighting: {
        recentPerformance: aiPerformance.recommendationQuality,
        userPreferences: 0.8,
        subjectStrength: 0.6
      }
    };
  }

  /**
   * Calculate trends from analytics
   */
  private static calculateTrends(analytics: MemoryAnalytics): {
    improvementTrend: 'improving' | 'declining' | 'stable';
    satisfactionTrend: 'improving' | 'declining' | 'stable';
    adherenceTrend: 'improving' | 'declining' | 'stable';
  } {
    return {
      improvementTrend: analytics.recentTrends.effectivenessTrend,
      satisfactionTrend: analytics.recentTrends.satisfactionTrend,
      adherenceTrend: analytics.recentTrends.acceptanceTrend
    };
  }

  /**
   * Build context from feedback data
   */
  private static async buildContextFromFeedback(
    feedbackData: FeedbackData
  ): Promise<AIContext> {
    // This would build a minimal context for cache updates
    // For now, return a basic structure
    return {
      stats: {
        xp: 0,
        level: 1,
        streak: 0,
        rank: 'Beginner',
        totalStudyTime: 0,
        averageAccuracy: 0
      },
      subjects: {},
      behavior: {
        dailyUsageMinutes: 0,
        consistencyScore: 0,
        sessionFrequency: 0,
        dropOffPoints: [],
        peakHours: [],
        studyPattern: 'consistent' as const,
        burnoutRisk: 'low' as const
      },
      recentActivity: [],
      aiHistory: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        dataCompleteness: 50,
        confidenceLevel: 0.5
      }
    };
  }

  /**
   * Get default insights
   */
  private static getDefaultInsights(): FeedbackInsights {
    return {
      userPatterns: {
        preferredSubjects: [],
        preferredDifficulty: 'medium',
        optimalStudyDuration: 30,
        peakPerformanceTimes: []
      },
      aiPerformance: {
        modelAccuracy: 0.5,
        recommendationQuality: 0.5,
        personalizationLevel: 0.5,
        improvementSuggestions: []
      },
      adaptiveAdjustments: {
        promptModifications: {},
        modelPreferences: {},
        contextWeighting: {}
      }
    };
  }

  /**
   * Batch process feedback for multiple users
   */
  static async batchProcessFeedback(
    feedbackList: FeedbackData[]
  ): Promise<{
    successful: number;
    failed: number;
    insights: Record<string, FeedbackInsights>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      insights: {} as Record<string, FeedbackInsights>
    };

    for (const feedback of feedbackList) {
      try {
        const result = await this.processFeedback(feedback);
        if (result.success) {
          results.successful++;
          results.insights[feedback.userId] = result.insights;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Batch feedback failed for user ${feedback.userId}:`, error);
        results.failed++;
      }
    }

    console.log(`Batch feedback processing: ${results.successful} successful, ${results.failed} failed`);
    return results;
  }

  /**
   * Get system-wide feedback statistics
   */
  static async getSystemFeedbackStats(): Promise<{
    totalFeedback: number;
    averageAcceptanceRate: number;
    averageEffectiveness: number;
    topImprovementAreas: string[];
    modelPerformanceComparison: Record<string, number>;
  }> {
    try {
      // This would aggregate feedback across all users
      // For now, return placeholder data
      return {
        totalFeedback: 0,
        averageAcceptanceRate: 0,
        averageEffectiveness: 0,
        topImprovementAreas: [],
        modelPerformanceComparison: {}
      };
    } catch (error) {
      console.error('System feedback stats error:', error);
      return {
        totalFeedback: 0,
        averageAcceptanceRate: 0,
        averageEffectiveness: 0,
        topImprovementAreas: [],
        modelPerformanceComparison: {}
      };
    }
  }
}

export default AIFeedbackLoop;
