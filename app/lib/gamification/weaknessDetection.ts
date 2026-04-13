// Weakness Detection System for Smart Recommendations
// Analyzes user performance to identify areas needing improvement

import { UserProgress, SubjectProgress } from './userSchema';
import { BACCALAUREATE_SUBJECTS } from './userSchema';

export interface WeaknessAnalysis {
  subjectId: string;
  subjectName: string;
  weaknessType: 'xp' | 'accuracy' | 'streak' | 'consistency' | 'engagement';
  severity: 'critical' | 'high' | 'medium' | 'low';
  score: number; // 0-100, lower is worse
  issues: string[];
  recommendations: string[];
  priority: number; // 1-10, higher is more urgent
}

export interface StrengthAnalysis {
  subjectId: string;
  subjectName: string;
  strengthType: 'xp' | 'accuracy' | 'streak' | 'consistency' | 'engagement';
  score: number; // 0-100, higher is better
  achievements: string[];
  leverageSuggestions: string[];
}

export interface LearningPattern {
  pattern: 'consistent' | 'inconsistent' | 'declining' | 'improving' | 'stagnant';
  subjectId: string;
  confidence: number; // 0-100
  trend: Array<{
    date: string;
    metric: number;
    context: string;
  }>;
}

export interface RecommendationEngine {
  priorityRecommendations: Array<{
    type: 'study' | 'practice' | 'review' | 'challenge' | 'break';
    subjectId?: string;
    title: string;
    description: string;
    urgency: 'immediate' | 'today' | 'this_week' | 'this_month';
    estimatedTime: number; // minutes
    expectedImpact: 'low' | 'medium' | 'high';
    confidence: number; // 0-100
  }>;
  motivationalMessages: string[];
  studyPlan: Array<{
    day: string;
    activities: Array<{
      subject: string;
      duration: number;
      type: string;
      goal: string;
    }>;
  }>;
}

/**
 * Advanced weakness detection and recommendation system
 */
export class WeaknessDetectionSystem {
  /**
   * Comprehensive weakness analysis
   */
  static analyzeWeaknesses(user: UserProgress): WeaknessAnalysis[] {
    const weaknesses: WeaknessAnalysis[] = [];
    const subjects = Object.entries(user.subjects);

    for (const [subjectId, progress] of subjects) {
      const subjectConfig = BACCALAUREATE_SUBJECTS[subjectId];
      if (!subjectConfig) continue;

      // XP-based weakness
      const xpWeakness = this.analyzeXPWeakness(subjectId, progress, subjects);
      if (xpWeakness) weaknesses.push(xpWeakness);

      // Accuracy-based weakness
      const accuracyWeakness = this.analyzeAccuracyWeakness(subjectId, progress);
      if (accuracyWeakness) weaknesses.push(accuracyWeakness);

      // Streak-based weakness
      const streakWeakness = this.analyzeStreakWeakness(subjectId, progress);
      if (streakWeakness) weaknesses.push(streakWeakness);

      // Consistency-based weakness
      const consistencyWeakness = this.analyzeConsistencyWeakness(subjectId, progress);
      if (consistencyWeakness) weaknesses.push(consistencyWeakness);

      // Engagement-based weakness
      const engagementWeakness = this.analyzeEngagementWeakness(subjectId, progress);
      if (engagementWeakness) weaknesses.push(engagementWeakness);
    }

    // Sort by priority (highest first)
    return weaknesses.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze XP-related weaknesses
   */
  private static analyzeXPWeakness(
    subjectId: string,
    progress: SubjectProgress,
    allSubjects: Array<[string, SubjectProgress]>
  ): WeaknessAnalysis | null {
    const allXP = allSubjects.map(([, p]) => p.xp);
    const averageXP = allXP.reduce((sum, xp) => sum + xp, 0) / allXP.length;
    const maxXP = Math.max(...allXP);

    if (progress.xp < averageXP * 0.5) {
      return {
        subjectId,
        subjectName: BACCALAUREATE_SUBJECTS[subjectId]?.displayName || subjectId,
        weaknessType: 'xp',
        severity: progress.xp < averageXP * 0.25 ? 'critical' : 'high',
        score: Math.round((progress.xp / maxXP) * 100),
        issues: [
          `XP level (${progress.xp}) is significantly below average (${Math.round(averageXP)})`,
          `Progress is ${Math.round(((maxXP - progress.xp) / maxXP) * 100)}% behind the strongest subject`
        ],
        recommendations: [
          'Focus on foundational concepts in this subject',
          'Complete daily practice sessions to build XP',
          'Use review mode to reinforce weak areas',
          'Consider starting with easier difficulty levels'
        ],
        priority: progress.xp < averageXP * 0.25 ? 10 : 8
      };
    }

    return null;
  }

  /**
   * Analyze accuracy-related weaknesses
   */
  private static analyzeAccuracyWeakness(
    subjectId: string,
    progress: SubjectProgress
  ): WeaknessAnalysis | null {
    const accuracy = progress.averageAccuracy || 0;

    if (accuracy < 60) {
      return {
        subjectId,
        subjectName: BACCALAUREATE_SUBJECTS[subjectId]?.displayName || subjectId,
        weaknessType: 'accuracy',
        severity: accuracy < 40 ? 'critical' : 'high',
        score: accuracy,
        issues: [
          `Low accuracy rate (${accuracy}%) indicates conceptual gaps`,
          'May be rushing through questions without proper understanding',
          'Could benefit from reviewing fundamental concepts'
        ],
        recommendations: [
          'Slow down and read questions carefully',
          'Review incorrect answers to understand mistakes',
          'Study theory before attempting practice questions',
          'Use hint system when available',
          'Focus on understanding rather than speed'
        ],
        priority: accuracy < 40 ? 9 : 7
      };
    }

    return null;
  }

  /**
   * Analyze streak-related weaknesses
   */
  private static analyzeStreakWeakness(
    subjectId: string,
    progress: SubjectProgress
  ): WeaknessAnalysis | null {
    const streak = progress.streak || 0;

    if (streak === 0) {
      return {
        subjectId,
        subjectName: BACCALAUREATE_SUBJECTS[subjectId]?.displayName || subjectId,
        weaknessType: 'streak',
        severity: 'high',
        score: 0,
        issues: [
          'No active streak in this subject',
          'Inconsistent study habits detected',
          'May be neglecting this subject entirely'
        ],
        recommendations: [
          'Set daily reminders for this subject',
          'Start with just 10-15 minutes per day',
          'Create a study schedule with this subject included',
          'Find study partners or groups for motivation'
        ],
        priority: 8
      };
    } else if (streak < 3) {
      return {
        subjectId,
        subjectName: BACCALAUREATE_SUBJECTS[subjectId]?.displayName || subjectId,
        weaknessType: 'streak',
        severity: 'medium',
        score: Math.round((streak / 7) * 100),
        issues: [
          `Short streak (${streak} days) indicates inconsistent practice`,
          'May be skipping days regularly'
        ],
        recommendations: [
          'Aim for at least 3 consecutive days',
          'Use calendar to block study time',
          'Set smaller, achievable daily goals'
        ],
        priority: 5
      };
    }

    return null;
  }

  /**
   * Analyze consistency-related weaknesses
   */
  private static analyzeConsistencyWeakness(
    subjectId: string,
    progress: SubjectProgress
  ): WeaknessAnalysis | null {
    // This would analyze historical data for consistency patterns
    // For now, use questions answered as a proxy
    const questionsPerLevel = progress.questionsAnswered / Math.max(1, progress.level);
    
    if (questionsPerLevel < 10) {
      return {
        subjectId,
        subjectName: BACCALAUREATE_SUBJECTS[subjectId]?.displayName || subjectId,
        weaknessType: 'consistency',
        severity: 'medium',
        score: Math.round((questionsPerLevel / 20) * 100),
        issues: [
          `Only ${progress.questionsAnswered} questions answered for level ${progress.level}`,
          'Low question engagement suggests inconsistent practice',
          'May be skipping practice sessions regularly'
        ],
        recommendations: [
          'Set daily question goals (e.g., 10 questions per day)',
          'Use spaced repetition for better retention',
          'Track study time to ensure consistency',
          'Join study groups for accountability'
        ],
        priority: 6
      };
    }

    return null;
  }

  /**
   * Analyze engagement-related weaknesses
   */
  private static analyzeEngagementWeakness(
    subjectId: string,
    progress: SubjectProgress
  ): WeaknessAnalysis | null {
    const daysSinceLastActivity = this.getDaysSinceLastActivity(progress.lastActivity);
    
    if (daysSinceLastActivity > 7) {
      return {
        subjectId,
        subjectName: BACCALAUREATE_SUBJECTS[subjectId]?.displayName || subjectId,
        weaknessType: 'engagement',
        severity: daysSinceLastActivity > 30 ? 'critical' : 'high',
        score: Math.max(0, 100 - (daysSinceLastActivity * 3)),
        issues: [
          `No activity in ${daysSinceLastActivity} days`,
          'Subject appears to be abandoned',
          'Risk of losing progress due to inactivity'
        ],
        recommendations: [
          'Schedule a refresher session for this subject',
          'Start with basic concepts to rebuild confidence',
          'Set recurring calendar reminders',
          'Find new learning resources to reignite interest'
        ],
        priority: daysSinceLastActivity > 30 ? 10 : 7
      };
    }

    return null;
  }

  /**
   * Identify user strengths
   */
  static analyzeStrengths(user: UserProgress): StrengthAnalysis[] {
    const strengths: StrengthAnalysis[] = [];
    const subjects = Object.entries(user.subjects);

    for (const [subjectId, progress] of subjects) {
      const subjectConfig = BACCALAUREATE_SUBJECTS[subjectId];
      if (!subjectConfig) continue;

      // XP strength
      const allXP = subjects.map(([, p]) => p.xp);
      const maxXP = Math.max(...allXP);
      
      if (progress.xp >= maxXP * 0.8) {
        strengths.push({
          subjectId,
          subjectName: subjectConfig.displayName,
          strengthType: 'xp',
          score: Math.round((progress.xp / maxXP) * 100),
          achievements: [
            `Top performer in ${subjectConfig.displayName}`,
            `Level ${progress.level} achieved`,
            `${progress.xp} XP accumulated`
          ],
          leverageSuggestions: [
            `Use ${subjectConfig.displayName} knowledge to help with related subjects`,
            `Consider mentoring others in ${subjectConfig.displayName}`,
            `Take on advanced challenges in ${subjectConfig.displayName}`,
            `Apply ${subjectConfig.displayName} concepts to real-world problems`
          ]
        });
      }

      // Accuracy strength
      const accuracy = progress.averageAccuracy || 0;
      if (accuracy >= 85) {
        strengths.push({
          subjectId,
          subjectName: subjectConfig.displayName,
          strengthType: 'accuracy',
          score: accuracy,
          achievements: [
            `Excellent accuracy (${accuracy}%)`,
            'Consistent high performance',
            'Strong conceptual understanding'
          ],
          leverageSuggestions: [
            'Tackle more challenging problems',
            'Help peers who are struggling',
            'Explore advanced topics',
            'Participate in competitive challenges'
          ]
        });
      }

      // Streak strength
      const streak = progress.streak || 0;
      if (streak >= 14) {
        strengths.push({
          subjectId,
          subjectName: subjectConfig.displayName,
          strengthType: 'streak',
          score: Math.min(100, (streak / 30) * 100),
          achievements: [
            `${streak} day streak achieved`,
            'Excellent consistency',
            'Strong study habits'
          ],
          leverageSuggestions: [
            'Maintain current study schedule',
            'Share study strategies with others',
            'Use momentum to tackle difficult topics',
            'Consider setting higher goals'
          ]
        });
      }
    }

    return strengths.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate smart recommendations
   */
  static generateRecommendations(
    user: UserProgress,
    weaknesses: WeaknessAnalysis[],
    strengths: StrengthAnalysis[]
  ): RecommendationEngine {
    const priorityRecommendations = [];
    const motivationalMessages = [];
    const studyPlan = [];

    // Generate priority recommendations based on weaknesses
    for (const weakness of weaknesses.slice(0, 5)) { // Top 5 weaknesses
      const recommendation = this.createRecommendationFromWeakness(weakness);
      if (recommendation) priorityRecommendations.push(recommendation);
    }

    // Add strength-based recommendations
    for (const strength of strengths.slice(0, 3)) { // Top 3 strengths
      const recommendation = this.createRecommendationFromStrength(strength);
      if (recommendation) priorityRecommendations.push(recommendation);
    }

    // Generate motivational messages
    motivationalMessages.push(
      ...this.generateMotivationalMessages(user, weaknesses, strengths)
    );

    // Generate study plan
    studyPlan.push(...this.generateStudyPlan(user, weaknesses, strengths));

    return {
      priorityRecommendations: priorityRecommendations.sort((a, b) => b.confidence - a.confidence),
      motivationalMessages,
      studyPlan
    };
  }

  /**
   * Create recommendation from weakness
   */
  private static createRecommendationFromWeakness(
    weakness: WeaknessAnalysis
  ): RecommendationEngine['priorityRecommendations'][0] | null {
    const subjectConfig = BACCALAUREATE_SUBJECTS[weakness.subjectId];
    
    switch (weakness.weaknessType) {
      case 'xp':
        return {
          type: 'study',
          subjectId: weakness.subjectId,
          title: `Build Foundation in ${weakness.subjectName}`,
          description: 'Focus on understanding core concepts before advancing',
          urgency: weakness.severity === 'critical' ? 'immediate' : 'today',
          estimatedTime: 30,
          expectedImpact: 'high',
          confidence: 90
        };

      case 'accuracy':
        return {
          type: 'practice',
          subjectId: weakness.subjectId,
          title: `Improve Accuracy in ${weakness.subjectName}`,
          description: 'Focus on understanding rather than speed',
          urgency: 'today',
          estimatedTime: 25,
          expectedImpact: 'high',
          confidence: 85
        };

      case 'streak':
        return {
          type: 'study',
          subjectId: weakness.subjectId,
          title: `Build Consistency in ${weakness.subjectName}`,
          description: 'Start with short daily sessions to build momentum',
          urgency: 'today',
          estimatedTime: 15,
          expectedImpact: 'medium',
          confidence: 80
        };

      case 'engagement':
        return {
          type: 'review',
          subjectId: weakness.subjectId,
          title: `Re-engage with ${weakness.subjectName}`,
          description: 'Review previous material to rebuild confidence',
          urgency: weakness.severity === 'critical' ? 'immediate' : 'this_week',
          estimatedTime: 20,
          expectedImpact: 'high',
          confidence: 75
        };

      default:
        return null;
    }
  }

  /**
   * Create recommendation from strength
   */
  private static createRecommendationFromStrength(
    strength: StrengthAnalysis
  ): RecommendationEngine['priorityRecommendations'][0] | null {
    const subjectConfig = BACCALAUREATE_SUBJECTS[strength.subjectId];
    
    switch (strength.strengthType) {
      case 'xp':
        return {
          type: 'challenge',
          subjectId: strength.subjectId,
          title: `Challenge Yourself in ${strength.subjectName}`,
          description: 'Use your strong foundation to tackle advanced topics',
          urgency: 'this_week',
          estimatedTime: 45,
          expectedImpact: 'medium',
          confidence: 85
        };

      case 'accuracy':
        return {
          type: 'challenge',
          subjectId: strength.subjectId,
          title: `Test Your Mastery in ${strength.subjectName}`,
          description: 'Take on difficult problems to further improve',
          urgency: 'this_week',
          estimatedTime: 35,
          expectedImpact: 'medium',
          confidence: 80
        };

      default:
        return null;
    }
  }

  /**
   * Generate motivational messages
   */
  private static generateMotivationalMessages(
    user: UserProgress,
    weaknesses: WeaknessAnalysis[],
    strengths: StrengthAnalysis[]
  ): string[] {
    const messages: string[] = [];

    // Overall progress message
    if (user.globalStats.level >= 10) {
      messages.push('You\'ve built a strong foundation! Keep pushing forward.');
    } else if (user.globalStats.level >= 5) {
      messages.push('Great progress! You\'re developing solid learning habits.');
    } else {
      messages.push('Every expert was once a beginner. You\'re on the right path!');
    }

    // Strength-based motivation
    if (strengths.length > 0) {
      const topStrength = strengths[0];
      messages.push(`You excel in ${topStrength.subjectName}! Use this confidence to tackle challenges.`);
    }

    // Weakness-based encouragement
    if (weaknesses.length > 0) {
      const criticalWeaknesses = weaknesses.filter(w => w.severity === 'critical');
      if (criticalWeaknesses.length > 0) {
        messages.push('Everyone has areas to improve. Focus on one weakness at a time.');
      } else {
        messages.push('Your weaknesses are opportunities for growth. Small steps lead to big changes!');
      }
    }

    // Streak motivation
    if (user.globalStats.streak >= 7) {
      messages.push(`${user.globalStats.streak} day streak! You\'re building incredible momentum!`);
    } else if (user.globalStats.streak >= 3) {
      messages.push('Nice streak! Keep the momentum going!');
    }

    return messages;
  }

  /**
   * Generate personalized study plan
   */
  private static generateStudyPlan(
    user: UserProgress,
    weaknesses: WeaknessAnalysis[],
    strengths: StrengthAnalysis[]
  ): RecommendationEngine['studyPlan'] {
    const plan = [];
    const today = new Date();
    
    // Next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      const dayPlan = {
        day: date.toISOString().split('T')[0],
        activities: [] as Array<{
          subject: string;
          duration: number;
          type: string;
          goal: string;
        }>
      };

      // Add weakness-focused activities
      if (i < 3 && weaknesses.length > 0) { // First 3 days focus on weaknesses
        const topWeakness = weaknesses[i % weaknesses.length];
        dayPlan.activities.push({
          subject: topWeakness.subjectName,
          duration: 25,
          type: 'foundational_study',
          goal: `Address ${topWeakness.weaknessType} weakness`
        });
      }

      // Add strength-maintaining activities
      if (i >= 3 && strengths.length > 0) { // Later days maintain strengths
        const topStrength = strengths[i % strengths.length];
        dayPlan.activities.push({
          subject: topStrength.subjectName,
          duration: 20,
          type: 'practice',
          goal: 'Maintain strength and confidence'
        });
      }

      // Add review sessions
      if (i % 2 === 1) { // Every other day
        dayPlan.activities.push({
          subject: 'Mixed Review',
          duration: 15,
          type: 'review',
          goal: 'Reinforce recent learning'
        });
      }

      plan.push(dayPlan);
    }

    return plan;
  }

  /**
   * Get days since last activity
   */
  private static getDaysSinceLastActivity(lastActivity: string): number {
    const lastDate = new Date(lastActivity);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get weakness severity color
   */
  static getWeaknessSeverityColor(severity: WeaknessAnalysis['severity']): string {
    const colors = {
      critical: '#DC2626',
      high: '#F59E0B',
      medium: '#3B82F6',
      low: '#10B981'
    };
    
    return colors[severity] || colors.medium;
  }

  /**
   * Get strength score color
   */
  static getStrengthScoreColor(score: number): string {
    if (score >= 90) return '#10B981';
    if (score >= 75) return '#22C55E';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  }

  /**
   * Format weakness analysis for display
   */
  static formatWeaknessForDisplay(weakness: WeaknessAnalysis): {
    title: string;
    subtitle: string;
    color: string;
    icon: string;
    actionable: boolean;
  } {
    const typeInfo = {
      xp: {
        title: 'XP Deficiency',
        subtitle: `Score: ${weakness.score}/100`,
        icon: '📊'
      },
      accuracy: {
        title: 'Accuracy Issues',
        subtitle: `Score: ${weakness.score}%`,
        icon: '🎯'
      },
      streak: {
        title: 'Streak Problems',
        subtitle: 'Inconsistent practice',
        icon: '🔥'
      },
      consistency: {
        title: 'Consistency Issues',
        subtitle: 'Irregular engagement',
        icon: '📈'
      },
      engagement: {
        title: 'Low Engagement',
        subtitle: 'Infrequent activity',
        icon: '⏰'
      }
    };

    const info = typeInfo[weakness.weaknessType];
    
    return {
      title: info.title,
      subtitle: info.subtitle,
      color: this.getWeaknessSeverityColor(weakness.severity),
      icon: info.icon,
      actionable: true
    };
  }

  /**
   * Get overall learning health score
   */
  static getLearningHealthScore(user: UserProgress): {
    overallScore: number;
    category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    factors: {
      xpProgress: number;
      accuracyRate: number;
      consistencyScore: number;
      engagementLevel: number;
    };
    recommendations: string[];
  } {
    const subjects = Object.values(user.subjects);
    
    // Calculate individual factors
    const totalXP = subjects.reduce((sum, s) => sum + s.xp, 0);
    const avgXP = totalXP / subjects.length;
    const maxXP = Math.max(...subjects.map(s => s.xp));
    const xpProgress = (avgXP / maxXP) * 100;

    const avgAccuracy = subjects.reduce((sum, s) => sum + (s.averageAccuracy || 0), 0) / subjects.length;

    const avgStreak = subjects.reduce((sum, s) => sum + (s.streak || 0), 0) / subjects.length;
    const consistencyScore = Math.min(100, (avgStreak / 7) * 100);

    const recentActivity = subjects.filter(s => 
      this.getDaysSinceLastActivity(s.lastActivity) <= 7
    ).length;
    const engagementLevel = (recentActivity / subjects.length) * 100;

    // Calculate overall score
    const overallScore = (
      xpProgress * 0.3 +
      avgAccuracy * 0.3 +
      consistencyScore * 0.2 +
      engagementLevel * 0.2
    );

    // Determine category
    let category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (overallScore >= 85) category = 'excellent';
    else if (overallScore >= 70) category = 'good';
    else if (overallScore >= 55) category = 'fair';
    else if (overallScore >= 40) category = 'poor';
    else category = 'critical';

    // Generate recommendations
    const recommendations = [];
    if (xpProgress < 60) recommendations.push('Focus on building XP through consistent practice');
    if (avgAccuracy < 70) recommendations.push('Improve accuracy by reviewing concepts before answering');
    if (consistencyScore < 50) recommendations.push('Establish a daily study routine');
    if (engagementLevel < 60) recommendations.push('Increase study frequency across all subjects');

    return {
      overallScore: Math.round(overallScore),
      category,
      factors: {
        xpProgress: Math.round(xpProgress),
        accuracyRate: Math.round(avgAccuracy),
        consistencyScore: Math.round(consistencyScore),
        engagementLevel: Math.round(engagementLevel)
      },
      recommendations
    };
  }
}

export default WeaknessDetectionSystem;
