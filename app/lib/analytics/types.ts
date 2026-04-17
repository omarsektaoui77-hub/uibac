/**
 * Analytics Types
 * 
 * Type definitions for behavior analysis and insights.
 */

import { TelemetryEvent } from '../types/telemetry';

/** Output from behavior analysis */
export interface BehaviorInsights {
  weakTopics: string[];
  frictionPoints: string[];
  avgLatency: number;
}

/** Topic performance metrics */
export interface TopicStats {
  total: number;
  correct: number;
  accuracy: number;
  avgTimeMs: number;
}

/** User learning profile */
export interface UserLearningProfile {
  userId: string;
  weakTopics: string[];
  strongTopics: string[];
  avgResponseTimeMs: number;
  preferredDifficulty: 'easy' | 'medium' | 'hard';
  lastUpdated: string;
}
