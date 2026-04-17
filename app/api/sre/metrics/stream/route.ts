/**
 * Real-Time Metrics Stream API (SSE)
 * 
 * Server-Sent Events endpoint for live dashboard updates
 * Streams: stability score, error rates, fix outcomes, system health
 * 
 * Endpoint: GET /api/sre/metrics/stream
 */

import { NextRequest } from 'next/server';
import { calculateStabilityScore, getCurrentMetrics } from '@/lib/sre/stabilityScoring';
import { getLearningStats } from '@/lib/sre/learningEngine';
import { getSystemHealthSnapshot, generateInsights } from '@/lib/sre/insightsEngine';

/**
 * SSE Event types
 */
type StreamEvent =
  | { type: 'METRIC_UPDATE'; payload: MetricUpdatePayload }
  | { type: 'HEALTH_UPDATE'; payload: HealthUpdatePayload }
  | { type: 'INSIGHT_UPDATE'; payload: InsightUpdatePayload }
  | { type: 'LEARNING_UPDATE'; payload: LearningUpdatePayload };

interface MetricUpdatePayload {
  stability_score: number;
  error_rate: number;
  rollback_rate: number;
  fix_success_rate: number;
  timestamp: number;
}

interface HealthUpdatePayload {
  overall_health: 'excellent' | 'good' | 'fair' | 'poor';
  stability_score: number;
  active_concerns: number;
  recent_achievements: number;
}

interface InsightUpdatePayload {
  insights: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
  }>;
  count: number;
}

interface LearningUpdatePayload {
  total_fixes: number;
  success_rate: number;
  patterns_learned: number;
  improvement_trend: number;
}

/**
 * GET /api/sre/metrics/stream
 * SSE endpoint for real-time metrics
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial data
      sendInitialData(controller, encoder);
      
      // Set up interval for updates
      const interval = setInterval(() => {
        try {
          sendUpdate(controller, encoder);
        } catch (error) {
          console.error('[SSE] Error sending update:', error);
          clearInterval(interval);
          controller.close();
        }
      }, 5000); // Update every 5 seconds
      
      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Send initial data burst
 */
function sendInitialData(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): void {
  // Send stability score
  const stability = calculateStabilityScore();
  const metrics = getCurrentMetrics();
  
  const metricEvent: StreamEvent = {
    type: 'METRIC_UPDATE',
    payload: {
      stability_score: stability.overall,
      error_rate: metrics.error_rate,
      rollback_rate: metrics.rollback_rate,
      fix_success_rate: metrics.fix_success_rate,
      timestamp: Date.now(),
    },
  };
  
  controller.enqueue(
    encoder.encode(`event: METRIC_UPDATE\ndata: ${JSON.stringify(metricEvent)}\n\n`)
  );
  
  // Send health snapshot
  const health = getSystemHealthSnapshot();
  const healthEvent: StreamEvent = {
    type: 'HEALTH_UPDATE',
    payload: {
      overall_health: health.overall_health,
      stability_score: health.stability_score,
      active_concerns: health.active_concerns,
      recent_achievements: health.recent_achievements,
    },
  };
  
  controller.enqueue(
    encoder.encode(`event: HEALTH_UPDATE\ndata: ${JSON.stringify(healthEvent)}\n\n`)
  );
  
  // Send insights
  const insights = generateInsights();
  const insightEvent: StreamEvent = {
    type: 'INSIGHT_UPDATE',
    payload: {
      insights: insights.slice(0, 5).map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        title: i.title,
        description: i.description,
      })),
      count: insights.length,
    },
  };
  
  controller.enqueue(
    encoder.encode(`event: INSIGHT_UPDATE\ndata: ${JSON.stringify(insightEvent)}\n\n`)
  );
  
  // Send learning stats
  const learning = getLearningStats();
  const learningEvent: StreamEvent = {
    type: 'LEARNING_UPDATE',
    payload: {
      total_fixes: learning.total_fixes,
      success_rate: learning.overall_success_rate,
      patterns_learned: learning.patterns_learned,
      improvement_trend: learning.improvement_trend,
    },
  };
  
  controller.enqueue(
    encoder.encode(`event: LEARNING_UPDATE\ndata: ${JSON.stringify(learningEvent)}\n\n`)
  );
}

/**
 * Send periodic update
 */
function sendUpdate(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): void {
  // Alternate between different update types to reduce data volume
  const now = Date.now();
  const second = Math.floor(now / 1000) % 4;
  
  switch (second) {
    case 0:
      // Stability metrics (every 20s)
      if (second % 4 === 0) {
        const stability = calculateStabilityScore();
        const metrics = getCurrentMetrics();
        
        const event: StreamEvent = {
          type: 'METRIC_UPDATE',
          payload: {
            stability_score: stability.overall,
            error_rate: metrics.error_rate,
            rollback_rate: metrics.rollback_rate,
            fix_success_rate: metrics.fix_success_rate,
            timestamp: now,
          },
        };
        
        controller.enqueue(
          encoder.encode(`event: METRIC_UPDATE\ndata: ${JSON.stringify(event)}\n\n`)
        );
      }
      break;
      
    case 1:
      // Health snapshot
      const health = getSystemHealthSnapshot();
      const healthEvent: StreamEvent = {
        type: 'HEALTH_UPDATE',
        payload: {
          overall_health: health.overall_health,
          stability_score: health.stability_score,
          active_concerns: health.active_concerns,
          recent_achievements: health.recent_achievements,
        },
      };
      
      controller.enqueue(
        encoder.encode(`event: HEALTH_UPDATE\ndata: ${JSON.stringify(healthEvent)}\n\n`)
      );
      break;
      
    case 2:
      // Insights (less frequent - every minute)
      if (Math.floor(now / 60000) % 2 === 0) {
        const insights = generateInsights();
        if (insights.length > 0) {
          const insightEvent: StreamEvent = {
            type: 'INSIGHT_UPDATE',
            payload: {
              insights: insights.slice(0, 3).map(i => ({
                id: i.id,
                type: i.type,
                severity: i.severity,
                title: i.title,
                description: i.description,
              })),
              count: insights.length,
            },
          };
          
          controller.enqueue(
            encoder.encode(`event: INSIGHT_UPDATE\ndata: ${JSON.stringify(insightEvent)}\n\n`)
          );
        }
      }
      break;
      
    case 3:
      // Learning stats (every 30s)
      const learning = getLearningStats();
      const learningEvent: StreamEvent = {
        type: 'LEARNING_UPDATE',
        payload: {
          total_fixes: learning.total_fixes,
          success_rate: learning.overall_success_rate,
          patterns_learned: learning.patterns_learned,
          improvement_trend: learning.improvement_trend,
        },
      };
      
      controller.enqueue(
        encoder.encode(`event: LEARNING_UPDATE\ndata: ${JSON.stringify(learningEvent)}\n\n`)
      );
      break;
  }
}
