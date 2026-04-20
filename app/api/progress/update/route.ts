// Progress Update API Route
// Production-grade: type-safe, resilient, non-blocking events

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// import * as Sentry from '@sentry/nextjs';
import { withAuth, AuthenticatedUser } from '@/app/lib/auth/firebaseAuth';
import { withTieredRateLimit } from '@/app/lib/middleware/rateLimiting';
import { AtomicOperationsManager } from '@/app/lib/database/atomicOperations';
import { ValidationSchemas, ProgressUpdateInput } from '@/app/lib/validation/schemas';
import { ProgressCalculationInput } from '@/app/lib/gamification/progressCalculator';
import { ProgressCalculator } from '@/app/lib/gamification/progressCalculator';
import { EventSystem } from '@/app/lib/events/eventSystem';
import { metrics } from '@/app/lib/monitoring/metrics';
import { logger } from '@/app/lib/monitoring/logger';
import { alertManager } from '@/app/lib/monitoring/alerts';
import { TelemetryService } from '@/app/lib/telemetry/telemetryService';

// =========================
// 🔒 Standardized Response Helpers
// =========================
function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown
) {
  const responseObj: any = {
    success: false,
    error: message,
    code,
  };

  if (details) {
    responseObj.details = details;
  }

  return NextResponse.json(responseObj, { status });
}

function successResponse(data: unknown) {
  const responseObj: any = {
    success: true,
    data: data
  };
  return NextResponse.json(responseObj);
}

/**
 * POST /api/progress/update
 * 
 * Updates user progress with XP, streaks, and achievements
 * 
 * Headers:
 * - Authorization: Bearer <firebase_jwt_token>
 * 
 * Body:
 * {
 *   "earnedXP": 10,
 *   "subjectId": "mathematics",
 *   "activityType": "question",
 *   "difficulty": "medium",
 *   "isCorrect": true,
 *   "timeSpent": 30,
 *   "sessionId": "session_123",
 *   "metadata": {
 *     "userAgent": "Mozilla/5.0...",
 *     "questionId": "q_123"
 *   }
 * }
 */
// =========================
// 🚀 POST Handler - Production Grade
// =========================
async function handler(
  request: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse> {
  const startTime = Date.now();
  const route = '/api/progress/update';

  try {
    // ---------- Parse Body ----------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const duration = Date.now() - startTime;
      metrics.recordRequest(route, 400, duration);
      logger.log(route, 400, duration);
      return errorResponse('Invalid JSON in request body', 'INVALID_JSON', 400);
    }

    // ---------- Validate Input ----------
    const validationResult = ValidationSchemas.ProgressUpdate.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      metrics.recordRequest(route, 400, duration);
      logger.log(route, 400, duration);
      return errorResponse(
        'Invalid input',
          'VALIDATION_ERROR',
          400,
          {
            fieldErrors: validationResult.error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
      );
    }

    const input: ProgressUpdateInput = validationResult.data;

    // ---------- Telemetry Tracking (Non-blocking) ----------
    const telemetryEvent = {
      userId: user.uid,
      subjectId: input.subjectId || 'unknown',
      isCorrect: input.isCorrect,
      timeToAnswer: input.timeSpent || 0,
      difficulty: input.difficulty || 'medium',
      timestamp: new Date().toISOString(),
      dropOff: (input.timeSpent || 0) > 60,
      failureTag: !input.isCorrect ? 'LOGIC_ERROR' as const : undefined,
    };

    // Non-blocking - don't await
    TelemetryService.track(telemetryEvent).catch(() => {
      // Ignore telemetry errors
    });

    // Enrich Sentry context with API-specific metadata - temporarily disabled
    // Sentry.setContext('progress_update', {
    //   subjectId: input.subjectId,
    //   earnedXP: input.earnedXP,
    //   activityType: input.activityType,
    //   difficulty: input.difficulty,
    //   isCorrect: input.isCorrect,
    // });

    // ---------- Security Checks ----------
    // XP abuse protection (already enforced in AtomicOperationsManager)
    if (input.earnedXP > 1000) {
      const duration = Date.now() - startTime;
      metrics.recordRequest(route, 400, duration);
      logger.log(route, 400, duration);
      return errorResponse('XP amount exceeds maximum allowed', 'XP_EXCEEDED', 400);
    }

    // ---------- Extract Request Metadata ----------
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : undefined;

    // ---------- Prepare Progress Calculation ----------
    const progressInput: Omit<ProgressCalculationInput, 'user'> = {
      earnedXP: input.earnedXP,
      subjectId: input.subjectId,
      activityType: input.activityType,
      difficulty: input.difficulty,
      isCorrect: input.isCorrect,
      timeSpent: input.timeSpent
    };

    // ---------- Execute Atomic Update ----------
    const result = await AtomicOperationsManager.updateProgressAtomic(
      user.uid,
      progressInput as ProgressCalculationInput,
      input.sessionId,
      {
        userAgent,
        ipAddress
      }
    );

    // ---------- Handle Results ----------
    if (!result.success) {
      // Handle different error types
      if (result.error?.includes('blocked')) {
        const duration = Date.now() - startTime;
        metrics.recordRequest(route, 403, duration);
        logger.log(route, 403, duration);
        return errorResponse(
          'Activity blocked by anti-cheat system',
            'CHEAT_DETECTED',
            403,
            { reasons: result.error.split(': ').slice(1) }
        );
      }

      if (result.error?.includes('User not found')) {
        const duration = Date.now() - startTime;
        metrics.recordRequest(route, 404, duration);
        logger.log(route, 404, duration);
        return errorResponse('User profile not found', 'USER_NOT_FOUND', 404);
      }

      if (result.error?.includes('Rate limit exceeded')) {
        const duration = Date.now() - startTime;
        metrics.recordRequest(route, 429, duration);
        logger.log(route, 429, duration);
        return errorResponse('Too many requests', 'RATE_LIMITED', 429);
      }

      const duration = Date.now() - startTime;
      metrics.recordRequest(route, 500, duration);
      logger.log(route, 500, duration);
      return errorResponse(
        'Failed to update progress',
          'UPDATE_FAILED',
          500,
          { internalError: result.error }
      );
    }

    // ---------- Emit Events (Non-blocking) ----------
    const eventPromises = [];
    
    if (result.events) {
      for (const event of result.events) {
        eventPromises.push(
          EventSystem.emit(event.type, {
            ...event.data,
            userId: user.uid,
            timestamp: Date.now()
          }).catch(err => {
            // Event emission failure should NOT block the response
            console.error('Event emission failed:', err);
          })
        );
      }
    }

    // Wait for events to settle (but don't block response)
    Promise.allSettled(eventPromises).catch(() => {
      // Ignore failures - events are best-effort
    });

    // ---------- Return Success Response ----------
    const duration = Date.now() - startTime;
    metrics.recordRequest(route, 200, duration);
    logger.log(route, 200, duration);

    // Check alerts after recording metrics (non-blocking)
    const stats = metrics.getStats();
    alertManager.checkAlerts(stats.successRate, stats.averageResponseTime);

    return successResponse({
      user: result.user,
      events: result.events,
      updatedFields: {
        xp: input.earnedXP,
        subject: input.subjectId,
        activity: input.activityType
      }
    });

  } catch (error) {
    console.error('Progress update API error:', error);

    // Enrich Sentry context with user and route information - temporarily disabled
    // Sentry.setUser({
    //   id: user.uid,
    // });

    // Sentry.setContext('api_request', {
    //   route: route,
    //   method: 'POST',
    //   timestamp: new Date().toISOString(),
    // });

    // Sentry.setTag('error_code', 'INTERNAL_ERROR');
    // Sentry.captureException(error);

    const duration = Date.now() - startTime;
    metrics.recordRequest(route, 500, duration);
    logger.log(route, 500, duration);
    logger.error(route, 'Internal server error');
    return errorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    );
  }
}

// =========================
// 🔒 Apply Middleware
// =========================
export const POST = withAuth(withTieredRateLimit('progress')(handler));
