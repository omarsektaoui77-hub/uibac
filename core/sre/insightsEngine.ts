/**
 * Insights Engine for Cognitive SRE System
 * 
 * Generates investor-friendly insights and reports from:
 * - Learning engine data
 * - Stability scores
 * - Fix outcomes
 * - System metrics
 * 
 * Features:
 * - Weekly improvement summaries
 * - Most common failure analysis
 * - Auto-fix efficiency tracking
 * - Trend predictions
 */

import { getLearningStats, getTrendHistory, getTopPatterns } from './learningEngine';
import { getInvestorStabilitySummary, getScoreDistribution } from './stabilityScoring';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Generated insight */
export interface Insight {
  readonly id: string;
  readonly type: 'improvement' | 'concern' | 'achievement' | 'recommendation' | 'prediction';
  readonly severity: 'info' | 'success' | 'warning' | 'critical';
  readonly title: string;
  readonly description: string;
  readonly metric_value?: number;
  readonly metric_unit?: string;
  readonly trend?: 'up' | 'down' | 'stable';
  readonly actionable: boolean;
  readonly suggested_action?: string;
  readonly timestamp: number;
}

/** Weekly summary report */
export interface WeeklySummary {
  readonly week_start: number;
  readonly week_end: number;
  readonly stability_score_change: number;
  readonly fixes_improvement_pct: number;
  readonly most_common_failure?: string;
  readonly auto_fix_efficiency_change: number;
  readonly top_insights: Insight[];
  readonly key_achievements: string[];
  readonly areas_for_attention: string[];
}

/** System health snapshot */
export interface SystemHealthSnapshot {
  readonly timestamp: number;
  readonly overall_health: 'excellent' | 'good' | 'fair' | 'poor';
  readonly stability_score: number;
  readonly active_concerns: number;
  readonly recent_achievements: number;
  readonly top_insight: Insight | null;
}

// ============================================================================
// INSIGHT GENERATION
// ============================================================================

/**
 * Generate real-time insights for dashboard
 */
export function generateInsights(): Insight[] {
  const insights: Insight[] = [];
  
  // Get data from other engines
  const learningStats = getLearningStats();
  const stability = getInvestorStabilitySummary();
  const scoreDistribution = getScoreDistribution();
  
  // 1. Stability improvement insight
  if (stability.improvement_week_over_week > 5) {
    insights.push({
      id: `stability-improvement-${Date.now()}`,
      type: 'improvement',
      severity: 'success',
      title: 'System Stability Improved',
      description: `System stability increased by ${stability.improvement_week_over_week.toFixed(1)}% this week, reaching a score of ${stability.current_score}.`,
      metric_value: stability.improvement_week_over_week,
      metric_unit: '%',
      trend: 'up',
      actionable: false,
      timestamp: Date.now(),
    });
  }
  
  // 2. Auto-fix efficiency insight
  if (learningStats.improvement_trend > 10) {
    insights.push({
      id: `fix-efficiency-${Date.now()}`,
      type: 'achievement',
      severity: 'success',
      title: 'Auto-Fix Efficiency Increased',
      description: `AI auto-fix success rate improved by ${learningStats.improvement_trend.toFixed(1)}% through continuous learning.`,
      metric_value: learningStats.overall_success_rate,
      metric_unit: '%',
      trend: 'up',
      actionable: false,
      timestamp: Date.now(),
    });
  }
  
  // 3. Pattern learning insight
  if (learningStats.patterns_learned > 10) {
    insights.push({
      id: `patterns-learned-${Date.now()}`,
      type: 'achievement',
      severity: 'info',
      title: 'Knowledge Base Growing',
      description: `System has learned ${learningStats.patterns_learned} fix patterns, enabling faster resolution of recurring issues.`,
      metric_value: learningStats.patterns_learned,
      metric_unit: 'patterns',
      trend: 'up',
      actionable: false,
      timestamp: Date.now(),
    });
  }
  
  // 4. Success rate concern
  if (learningStats.overall_success_rate < 70) {
    insights.push({
      id: `success-rate-concern-${Date.now()}`,
      type: 'concern',
      severity: 'warning',
      title: 'Auto-Fix Success Rate Below Target',
      description: `Current auto-fix success rate is ${learningStats.overall_success_rate.toFixed(1)}%, below the recommended 75% threshold.`,
      metric_value: learningStats.overall_success_rate,
      metric_unit: '%',
      trend: learningStats.improvement_trend > 0 ? 'up' : 'down',
      actionable: true,
      suggested_action: 'Review failed fixes and adjust confidence thresholds',
      timestamp: Date.now(),
    });
  }
  
  // 5. Score distribution insight
  const totalReadings = 
    scoreDistribution.excellent + 
    scoreDistribution.good + 
    scoreDistribution.fair + 
    scoreDistribution.poor + 
    scoreDistribution.critical;
  
  if (totalReadings > 0) {
    const excellentPct = (scoreDistribution.excellent / totalReadings) * 100;
    if (excellentPct > 80) {
      insights.push({
        id: `excellent-uptime-${Date.now()}`,
        type: 'achievement',
        severity: 'success',
        title: 'Exceptional System Reliability',
        description: `System maintained excellent stability for ${excellentPct.toFixed(0)}% of the time period.`,
        metric_value: excellentPct,
        metric_unit: '%',
        trend: 'stable',
        actionable: false,
        timestamp: Date.now(),
      });
    }
  }
  
  // 6. Generate most common failure insight
  const topPatterns = getTopPatterns(5);
  const problematicPatterns = topPatterns.filter(p => p.success_rate < 0.5);
  if (problematicPatterns.length > 0) {
    insights.push({
      id: `common-failure-${Date.now()}`,
      type: 'recommendation',
      severity: 'warning',
      title: 'Most Common Failure Pattern',
      description: `Pattern with ${(problematicPatterns[0].success_rate * 100).toFixed(0)}% success rate needs attention. Review associated error types.`,
      metric_value: problematicPatterns[0].success_rate * 100,
      metric_unit: '%',
      trend: 'down',
      actionable: true,
      suggested_action: 'Investigate root cause and improve patch quality',
      timestamp: Date.now(),
    });
  }
  
  // 7. Learning velocity insight
  if (learningStats.total_fixes > 20 && learningStats.improvement_trend > 20) {
    insights.push({
      id: `learning-velocity-${Date.now()}`,
      type: 'achievement',
      severity: 'success',
      title: 'Rapid System Improvement',
      description: `System demonstrates strong learning velocity with ${learningStats.improvement_trend.toFixed(0)}% improvement in fix quality.`,
      metric_value: learningStats.improvement_trend,
      metric_unit: '%',
      trend: 'up',
      actionable: false,
      timestamp: Date.now(),
    });
  }
  
  return insights.sort((a, b) => {
    // Sort by severity (critical first)
    const severityOrder = { critical: 0, warning: 1, success: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate weekly summary report
 */
export function generateWeeklySummary(): WeeklySummary {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  
  // Get trend data
  const recentTrend = getTrendHistory(7);
  const previousTrend = getTrendHistory(14).filter(t => t.timestamp < weekAgo);
  
  // Calculate improvements
  const recentAvg = recentTrend.length > 0
    ? recentTrend.reduce((s, t) => s + t.success_rate, 0) / recentTrend.length
    : 0;
  const previousAvg = previousTrend.length > 0
    ? previousTrend.reduce((s, t) => s + t.success_rate, 0) / previousTrend.length
    : recentAvg;
  
  const fixesImprovement = previousAvg > 0
    ? ((recentAvg - previousAvg) / previousAvg) * 100
    : 0;
  
  // Get stability change
  const stability = getInvestorStabilitySummary();
  
  // Generate insights
  const insights = generateInsights();
  
  // Extract achievements and concerns
  const achievements = insights
    .filter(i => i.type === 'achievement')
    .map(i => i.title);
  
  const concerns = insights
    .filter(i => i.type === 'concern')
    .map(i => `${i.title}: ${i.description}`);
  
  // Find most common failure from insights
  const failureInsight = insights.find(i => i.id.includes('common-failure'));
  
  return {
    week_start: weekAgo,
    week_end: now,
    stability_score_change: stability.improvement_week_over_week,
    fixes_improvement_pct: fixesImprovement,
    most_common_failure: failureInsight?.description,
    auto_fix_efficiency_change: getLearningStats().improvement_trend,
    top_insights: insights.slice(0, 5),
    key_achievements: achievements,
    areas_for_attention: concerns,
  };
}

/**
 * Get system health snapshot for real-time dashboard
 */
export function getSystemHealthSnapshot(): SystemHealthSnapshot {
  const stability = getInvestorStabilitySummary();
  const insights = generateInsights();
  
  const activeConcerns = insights.filter(i => 
    i.type === 'concern' || i.severity === 'critical' || i.severity === 'warning'
  ).length;
  
  const recentAchievements = insights.filter(i => 
    i.type === 'achievement' && i.timestamp > Date.now() - 24 * 60 * 60 * 1000
  ).length;
  
  // Determine overall health
  let overallHealth: SystemHealthSnapshot['overall_health'] = 'good';
  if (stability.current_score >= 90) overallHealth = 'excellent';
  else if (stability.current_score >= 75) overallHealth = 'good';
  else if (stability.current_score >= 60) overallHealth = 'fair';
  else overallHealth = 'poor';
  
  // Get most important insight
  const topInsight = insights[0] || null;
  
  return {
    timestamp: Date.now(),
    overall_health: overallHealth,
    stability_score: stability.current_score,
    active_concerns: activeConcerns,
    recent_achievements: recentAchievements,
    top_insight: topInsight,
  };
}

// ============================================================================
// INVESTOR-FACING REPORTS
// ============================================================================

/**
 * Generate investor report
 */
export function generateInvestorReport(): {
  executive_summary: string;
  key_metrics: Array<{ label: string; value: string; trend: string }>;
  highlights: string[];
  concerns: string[];
  outlook: string;
} {
  const stability = getInvestorStabilitySummary();
  const learning = getLearningStats();
  const insights = generateInsights();
  
  // Executive summary
  let executiveSummary = '';
  if (stability.current_score >= 90) {
    executiveSummary = `System demonstrates exceptional reliability with a stability score of ${stability.current_score}/100. Auto-healing capabilities show ${learning.overall_success_rate.toFixed(0)}% success rate, significantly reducing manual intervention needs.`;
  } else if (stability.current_score >= 75) {
    executiveSummary = `System maintains strong stability at ${stability.current_score}/100. Auto-fix learning is improving with ${learning.patterns_learned} patterns now recognized for rapid resolution.`;
  } else {
    executiveSummary = `System stability at ${stability.current_score}/100 requires attention. ${learning.overall_success_rate.toFixed(0)}% auto-fix success rate indicates room for improvement in AI decisioning.`;
  }
  
  // Key metrics
  const keyMetrics = [
    {
      label: 'Stability Score',
      value: `${stability.current_score}/100`,
      trend: stability.trend,
    },
    {
      label: 'Auto-Fix Success',
      value: `${learning.overall_success_rate.toFixed(1)}%`,
      trend: learning.improvement_trend > 0 ? 'improving' : 'stable',
    },
    {
      label: 'Patterns Learned',
      value: `${learning.patterns_learned}`,
      trend: 'up',
    },
    {
      label: 'Uptime (30d)',
      value: `${stability.uptime_30d.toFixed(2)}%`,
      trend: 'stable',
    },
  ];
  
  // Highlights and concerns
  const highlights = insights
    .filter(i => i.type === 'achievement' || i.type === 'improvement')
    .slice(0, 3)
    .map(i => i.description);
  
  const concerns = insights
    .filter(i => i.type === 'concern')
    .slice(0, 3)
    .map(i => i.description);
  
  // Outlook
  let outlook = '';
  if (stability.improvement_week_over_week > 0) {
    outlook = `Positive trajectory with ${stability.improvement_week_over_week.toFixed(1)}% week-over-week improvement. Continued investment in AI learning expected to drive further automation and cost savings.`;
  } else if (learning.improvement_trend > 0) {
    outlook = `Fix quality improving through machine learning. System resilience expected to strengthen as pattern recognition expands.`;
  } else {
    outlook = `System stable but monitoring for optimization opportunities. Recommend review of auto-fix thresholds to improve success rates.`;
  }
  
  return {
    executive_summary: executiveSummary,
    key_metrics: keyMetrics,
    highlights,
    concerns,
    outlook,
  };
}

/**
 * Format insights for Slack/email notification
 */
export function formatInsightsForNotification(insights: Insight[]): string {
  if (insights.length === 0) {
    return 'No new insights at this time.';
  }
  
  const lines: string[] = ['📊 *System Insights*\n'];
  
  for (const insight of insights.slice(0, 5)) {
    const emoji = {
      critical: '🚨',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️',
    }[insight.severity];
    
    lines.push(`${emoji} *${insight.title}*`);
    lines.push(`${insight.description}`);
    
    if (insight.metric_value !== undefined) {
      lines.push(`Metric: ${insight.metric_value}${insight.metric_unit || ''}`);
    }
    
    if (insight.suggested_action) {
      lines.push(`Action: ${insight.suggested_action}`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).insightsEngine = {
    generateInsights,
    generateWeeklySummary,
    getSystemHealthSnapshot,
    generateInvestorReport,
    formatInsightsForNotification,
  };
}
