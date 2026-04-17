/**
 * Core Telemetry Types
 * 
 * Strict type definitions for user behavior tracking
 * and adaptive learning analytics.
 */

/** Failure classification tags */
export type FailureTag =
  | 'LOGIC_ERROR'
  | 'UX_FRICTION'
  | 'TIMEOUT'
  | 'MODEL_ERROR';

/** Telemetry event from user interaction */
export interface TelemetryEvent {
  userId: string;
  subjectId: string;
  isCorrect: boolean;
  timeToAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timestamp: string;

  // derived fields
  dropOff?: boolean;
  failureTag?: FailureTag;
}
