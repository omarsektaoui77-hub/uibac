// Background Jobs API Route
// Management interface for background jobs

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedUser } from '@/app/lib/auth/firebaseAuth';
import { BackgroundJobManager } from '@/app/lib/jobs/backgroundJobs';
import { z } from 'zod';

/**
 * GET /api/jobs
 * 
 * Get job statistics and list
 * 
 * Query parameters:
 * - status: pending | running | completed | failed (optional)
 * - type: string (optional)
 * - limit: number (max 100, default 50)
 */
async function handler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get job statistics
    const stats = BackgroundJobManager.getJobStats();

    // Filter jobs if requested
    const filteredJobs: any[] = [];
    
    if (status || type) {
      // In a real implementation, we'd filter the jobs
      // For now, return the stats
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        jobs: filteredJobs
      },
      metadata: {
        timestamp: new Date().toISOString(),
        filters: { status, type, limit }
      }
    });

  } catch (error) {
    console.error('Jobs API error:', error);

    return NextResponse.json({
      error: 'Failed to fetch job information',
      code: 'JOBS_ERROR'
    }, { status: 500 });
  }
}

/**
 * POST /api/jobs
 * 
 * Queue a new job
 * 
 * Body:
 * {
 *   "type": "generate_insights",
 *   "data": { "userIds": ["user1", "user2"] },
 *   "priority": "medium",
 *   "scheduledAt": "2024-01-01T00:00:00Z" (optional)
 * }
 */
async function postHandler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate request body
    const schema = z.object({
      type: z.string(),
      data: z.any(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      scheduledAt: z.string().datetime().optional(),
      maxAttempts: z.number().positive().max(10).optional()
    });

    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: validationResult.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    const { type, data, priority, scheduledAt, maxAttempts } = validationResult.data;

    // Queue the job
    const jobId = await BackgroundJobManager.queueJob(type, data, {
      priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      maxAttempts
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        type,
        status: 'queued'
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Job queue error:', error);

    return NextResponse.json({
      error: 'Failed to queue job',
      code: 'QUEUE_ERROR'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/jobs
 * 
 * Cancel a job
 * 
 * Query parameters:
 * - jobId: string (required)
 */
async function deleteHandler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({
        error: 'Job ID is required',
        code: 'MISSING_JOB_ID'
      }, { status: 400 });
    }

    const cancelled = BackgroundJobManager.cancelJob(jobId);

    if (!cancelled) {
      return NextResponse.json({
        error: 'Job not found or cannot be cancelled',
        code: 'CANCEL_FAILED'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        cancelled: true
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Job cancel error:', error);

    return NextResponse.json({
      error: 'Failed to cancel job',
      code: 'CANCEL_ERROR'
    }, { status: 500 });
  }
}

// Apply admin authentication
export const GET = withAdminAuth(handler);
export const POST = withAdminAuth(postHandler);
export const DELETE = withAdminAuth(deleteHandler);
