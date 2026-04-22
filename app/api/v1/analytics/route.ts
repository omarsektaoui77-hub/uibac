// Analytics API Route
// Provides comprehensive analytics and insights for users and admins

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/app/lib/auth/firebaseAuth';
import { withTieredRateLimit } from '@/app/lib/middleware/rateLimiting';
import { ProgressAnalytics } from '@/app/lib/analytics/progressAnalytics';
import { ValidationSchemas, AnalyticsQueryInput } from '@/app/lib/validation/schemas';

/**
 * GET /api/analytics
 * 
 * Get user analytics and insights
 * 
 * Query parameters:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - subjectId: string (optional)
 * - activityType: string (optional)
 * - limit: number (max 1000, default 100)
 * - offset: number (max 10000, default 0)
 * - includeInsights: boolean (default true)
 */
async function handler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      subjectId: searchParams.get('subjectId') || undefined,
      activityType: searchParams.get('activityType') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
      includeInsights: searchParams.get('includeInsights') !== 'false'
    };

    // Validate query parameters
    const validationResult = ValidationSchemas.AnalyticsQuery.safeParse(queryData);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validationResult.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    const validatedQuery: AnalyticsQueryInput = validationResult.data;

    // Get progress logs
    const progressLogs = await ProgressAnalytics.getProgressLogs(user.uid, {
      startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
      endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
      subjectId: validatedQuery.subjectId,
      activityType: validatedQuery.activityType as any,
      limit: validatedQuery.limit
    });

    // Get user analytics summary
    const userAnalytics = await ProgressAnalytics.getUserAnalytics(user.uid);

    // Get insights if requested
    let insights: any[] = [];
    if (queryData.includeInsights) {
      insights = await ProgressAnalytics.getUserInsights(user.uid, 10);
    }

    // Calculate additional metrics
    const metrics = {
      totalXP: progressLogs.reduce((sum, log) => sum + log.xpEarned, 0),
      totalStudyTime: progressLogs.reduce((sum, log) => sum + (log.metadata.timeSpent || 0), 0),
      averageAccuracy: progressLogs.length > 0 
        ? (progressLogs.filter(log => log.metadata.isCorrect !== false).length / progressLogs.length) * 100 
        : 0,
      activitiesCompleted: progressLogs.length,
      uniqueSubjects: new Set(progressLogs.filter(log => log.subjectId).map(log => log.subjectId)).size,
      averageXPPerActivity: progressLogs.length > 0 
        ? progressLogs.reduce((sum, log) => sum + log.xpEarned, 0) / progressLogs.length 
        : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        progressLogs,
        userAnalytics,
        insights,
        metrics,
        pagination: {
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          total: progressLogs.length
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: user.uid
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);

    return NextResponse.json({
      error: 'Failed to fetch analytics',
      code: 'ANALYTICS_ERROR'
    }, { status: 500 });
  }
}

// Apply authentication and rate limiting
export const GET = withAuth(withTieredRateLimit('analytics')(handler));
