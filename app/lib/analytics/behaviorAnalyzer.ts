/**
 * Behavior Analyzer
 * 
 * Analyzes telemetry events to detect weak topics,
 * friction points, and learning patterns.
 */

import { TelemetryEvent } from '../types/telemetry';
import { BehaviorInsights, TopicStats } from './types';

export class BehaviorAnalyzer {
  /**
   * Analyze telemetry events and extract insights
   */
  static analyze(events: TelemetryEvent[]): BehaviorInsights {
    const topicStats: Record<string, TopicStats> = {};
    let totalTime = 0;

    for (const e of events) {
      if (!topicStats[e.subjectId]) {
        topicStats[e.subjectId] = {
          total: 0,
          correct: 0,
          accuracy: 0,
          avgTimeMs: 0,
        };
      }

      const stats = topicStats[e.subjectId];
      stats.total++;
      if (e.isCorrect) stats.correct++;
      stats.avgTimeMs += e.timeToAnswer;
      totalTime += e.timeToAnswer;
    }

    // Calculate accuracy for each topic
    for (const stats of Object.values(topicStats)) {
      stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
      stats.avgTimeMs = stats.total > 0 ? stats.avgTimeMs / stats.total : 0;
    }

    // Find weak topics (accuracy < 50%)
    const weakTopics = Object.entries(topicStats)
      .filter(([_, v]) => v.accuracy < 0.5 && v.total >= 3) // At least 3 attempts
      .map(([k]) => k);

    const avgLatency = events.length > 0 ? totalTime / events.length : 0;

    return {
      weakTopics,
      frictionPoints: weakTopics, // Simple version: weak topics = friction
      avgLatency,
    };
  }

  /**
   * Get detailed stats for a specific topic
   */
  static getTopicStats(events: TelemetryEvent[], subjectId: string): TopicStats | null {
    const filtered = events.filter(e => e.subjectId === subjectId);
    if (filtered.length === 0) return null;

    const correct = filtered.filter(e => e.isCorrect).length;
    const totalTime = filtered.reduce((sum, e) => sum + e.timeToAnswer, 0);

    return {
      total: filtered.length,
      correct,
      accuracy: correct / filtered.length,
      avgTimeMs: totalTime / filtered.length,
    };
  }
}
