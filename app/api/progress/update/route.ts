// Progress Update API Route
// Production-grade: type-safe, resilient, non-blocking events

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthenticatedUser } from '@/app/lib/auth/firebaseAuth';
import { withTieredRateLimit } from '@/app/lib/middleware/rateLimiting';
import { AtomicOperationsManager } from '@/app/lib/database/atomicOperations';
import { ValidationSchemas, ProgressUpdateInput } from '@/app/lib/validation/schemas';
import { ProgressCalculationInput } from '@/app/lib/gamification/progressCalculator';
import { ProgressCalculator } from '@/app/lib/gamification/progressCalculator';
import { EventSystem } from '@/app/lib/events/eventSystem';

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
  try {
    // ---------- Parse Body ----------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 'INVALID_JSON', 400);
    }

    // ---------- Validate Input ----------
    const validationResult = ValidationSchemas.ProgressUpdate.safeParse(body);
    
    if (!validationResult.success) {
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

    // ---------- Security Checks ----------
    // XP abuse protection (already enforced in AtomicOperationsManager)
    if (input.earnedXP > 1000) {
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
        return errorResponse(
          'Activity blocked by anti-cheat system',
            'CHEAT_DETECTED',
            403,
            { reasons: result.error.split(': ').slice(1) }
        );
      }

      if (result.error?.includes('User not found')) {
        return errorResponse('User profile not found', 'USER_NOT_FOUND', 404);
      }

      if (result.error?.includes('Rate limit exceeded')) {
        return errorResponse('Too many requests', 'RATE_LIMITED', 429);
      }

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
