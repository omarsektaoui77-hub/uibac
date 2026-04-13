// Progress Update API Route
// Secure endpoint for updating user progress with validation and rate limiting

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthenticatedUser } from '@/app/lib/auth/firebaseAuth';
import { withTieredRateLimit } from '@/app/lib/middleware/rateLimiting';
import { AtomicOperationsManager } from '@/app/lib/database/atomicOperations';
import { ValidationSchemas, ProgressUpdateInput } from '@/app/lib/validation/schemas';
import { ProgressCalculator } from '@/app/lib/gamification/progressCalculator';
import { EventSystem } from '@/app/lib/events/eventSystem';

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
async function handler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ValidationSchemas.ProgressUpdate.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    const input: ProgressUpdateInput = validationResult.data;

    // Additional security validation
    if (input.earnedXP > 1000) {
      return NextResponse.json({
        error: 'XP amount exceeds maximum allowed',
        code: 'XP_EXCEEDED'
      }, { status: 400 });
    }

    // Extract request metadata
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : undefined;

    // Perform atomic update
    const result = await AtomicOperationsManager.updateProgressAtomic(
      user.uid,
      input,
      input.sessionId,
      {
        userAgent,
        ipAddress
      }
    );

    if (!result.success) {
      // Handle different error types
      if (result.error?.includes('blocked')) {
        return NextResponse.json({
          error: 'Activity blocked',
          details: result.error,
          code: 'ANTI_CHEAT_BLOCKED'
        }, { status: 403 });
      }

      if (result.retryable) {
        return NextResponse.json({
          error: 'Temporary issue, please try again',
          details: result.error,
          code: 'RETRYABLE_ERROR'
        }, { status: 503 });
      }

      return NextResponse.json({
        error: 'Failed to update progress',
        details: result.error,
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    // Emit events for real-time updates and notifications
    if (result.events && result.events.length > 0) {
      for (const event of result.events) {
        await EventSystem.emit(event.type, {
          userId: user.uid,
          ...event.data,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Return success response with updated user data
    return NextResponse.json({
      success: true,
      user: result.user,
      events: result.events,
      metadata: {
        processedAt: new Date().toISOString(),
        sessionId: input.sessionId,
        xpEarned: input.earnedXP,
        subjectId: input.subjectId
      }
    });

  } catch (error) {
    console.error('Progress update error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }, { status: 400 });
    }

    // Handle unexpected errors
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Apply authentication and rate limiting middleware
export const POST = withAuth(withTieredRateLimit('progress')(handler));

/**
 * GET /api/progress/update
 * 
 * Get current progress status (for validation and debugging)
 */
async function getStatusHandler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    // Get current user progress
    const userProgress = await AtomicOperationsManager.getUserProgress(user.uid);

    if (!userProgress) {
      return NextResponse.json({
        error: 'User profile not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // Get current rate limit status
    const rateLimitKey = `progress:user:${user.uid}`;
    const rateLimitResult = await AtomicOperationsManager.validateUserAction(
      user.uid,
      'progress_update',
      100, // 100 requests per hour
      3600  // 1 hour window
    );

    return NextResponse.json({
      success: true,
      user: userProgress,
      rateLimit: {
        allowed: rateLimitResult.allowed,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime.toISOString()
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get progress status error:', error);

    return NextResponse.json({
      error: 'Failed to get progress status',
      code: 'STATUS_ERROR'
    }, { status: 500 });
  }
}

export const GET = withAuth(getStatusHandler);
