// AI Coach API Route
// Main endpoint for AI-powered coaching recommendations

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthenticatedUser } from '@/app/lib/auth/firebaseAuth';
import { withTieredRateLimit } from '@/app/lib/middleware/rateLimiting';
import { ValidationSchemas } from '@/app/lib/validation/schemas';
import { AIContextEngine } from '@/app/lib/ai/contextEngine';
import { AIDecisionEngine } from '@/app/lib/ai/decisionEngine';
import { AIValidationLayer } from '@/app/lib/ai/validationLayer';
import { AICacheManager } from '@/app/lib/ai/aiCache';
import { AIMemorySystem } from '@/app/lib/ai/memorySystem';
import { AIFeedbackLoop } from '@/app/lib/ai/feedbackLoop';

/**
 * POST /api/ai/coach
 * 
 * Get AI-powered coaching recommendation
 * 
 * Headers:
 * - Authorization: Bearer <firebase_jwt_token>
 * 
 * Body:
 * {
 *   "options": {
 *     "includeRecentActivity": true,
 *     "activityDays": 7,
 *     "includeAIHistory": true,
 *     "historyDays": 30,
 *     "includeBehaviorAnalysis": true,
 *     "model": "openai",
 *     "temperature": 0.7,
 *     "maxTokens": 800,
 *     "useCache": true,
 *     "personalizedPrompt": true
 *   }
 * }
 */
async function handler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const startTime = Date.now();
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ValidationSchemas.AICoachRequest.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    const { options = {} } = validationResult.data;

    // Check cache first if enabled
    if (options.useCache !== false) {
      const cacheKey = `ai_coach_${user.uid}_${JSON.stringify(options)}`;
      const cachedRecommendation = await AICacheManager.getCachedRecommendation(user.uid, {} as any);
      
      if (cachedRecommendation) {
        const responseTime = Date.now() - startTime;
        
        return NextResponse.json({
          success: true,
          data: {
            recommendation: cachedRecommendation,
            metadata: {
              cached: true,
              responseTime,
              model: 'cached',
              confidence: cachedRecommendation.confidence
            }
          }
        });
      }
    }

    // Build AI context
    const context = await AIContextEngine.buildContext(user.uid, options);
    
    // Generate AI recommendation
    const recommendation = await AIDecisionEngine.generateRecommendation(context, {
      model: options.model || 'openai',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 800,
      includeContext: options.includeBehaviorAnalysis !== false,
      personalizedPrompt: options.personalizedPrompt !== false
    });

    // Validate recommendation
    const validation = await AIValidationLayer.validateRecommendation(recommendation, context);
    
    if (!validation.isValid) {
      console.error('AI recommendation failed validation:', validation.errors);
      
      return NextResponse.json({
        error: 'AI recommendation validation failed',
        details: validation.errors,
        safetyReport: AIValidationLayer.getSafetyReport(validation)
      }, { status: 500 });
    }

    // Store in cache
    if (options.useCache !== false) {
      await AICacheManager.cacheRecommendation(user.uid, context, recommendation, {
        ttl: options.cacheTTL,
        priority: 'high'
      });
    }

    // Store in memory for feedback loop
    const memoryId = await AIMemorySystem.storeRecommendation(user.uid, recommendation, context, {
      model: options.model || 'openai',
      confidence: recommendation.confidence,
      responseTime: Date.now() - startTime,
      cached: false
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        recommendation: validation.sanitizedRecommendation || recommendation,
        memoryId,
        validation: {
          isValid: validation.isValid,
          warnings: validation.warnings,
          safetyScore: validation.safetyScore,
          confidenceScore: validation.confidenceScore
        },
        metadata: {
          cached: false,
          responseTime,
          model: options.model || 'openai',
          contextCompleteness: context.metadata.dataCompleteness,
          aiConfidence: recommendation.confidence
        }
      }
    });

  } catch (error) {
    console.error('AI Coach error:', error);

    return NextResponse.json({
      error: 'Failed to generate AI recommendation',
      code: 'AI_COACH_ERROR'
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/coach
 * 
 * Get user's AI coaching history and analytics
 * 
 * Query parameters:
 * - history: boolean (default false)
 * - analytics: boolean (default false)
 * - insights: boolean (default false)
 * - days: number (default 30)
 * - limit: number (default 50)
 */
async function getHandler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const history = searchParams.get('history') === 'true';
    const analytics = searchParams.get('analytics') === 'true';
    const insights = searchParams.get('insights') === 'true';
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '50');

    const response: any = {};

    // Get AI coaching history
    if (history) {
      const memories = await AIMemorySystem.getUserMemory(user.uid, {
        days,
        limit,
        includeOutcomes: true
      });
      response.history = memories;
    }

    // Get feedback analytics
    if (analytics) {
      const feedbackAnalytics = await AIFeedbackLoop.getFeedbackAnalytics(user.uid, days);
      response.analytics = feedbackAnalytics;
    }

    // Get AI insights
    if (insights) {
      const memoryInsights = await AIMemorySystem.getInsights(user.uid);
      response.insights = memoryInsights;
    }

    // Get cache statistics
    const cacheStats = await AICacheManager.getStats();
    response.cacheStats = cacheStats;

    return NextResponse.json({
      success: true,
      data: response,
      metadata: {
        userId: user.uid,
        generatedAt: new Date().toISOString(),
        requestedData: { history, analytics, insights }
      }
    });

  } catch (error) {
    console.error('AI Coach GET error:', error);

    return NextResponse.json({
      error: 'Failed to fetch AI coaching data',
      code: 'AI_COACH_GET_ERROR'
    }, { status: 500 });
  }
}

/**
 * PUT /api/ai/coach/feedback
 * 
 * Submit feedback on AI recommendation
 * 
 * Body:
 * {
 *   "memoryId": "memory_123",
 *   "userAction": "accepted",
 *   "actualOutcome": {
 *     "subjectStudied": "mathematics",
 *     "duration": 25,
 *     "xpEarned": 15,
 *     "accuracy": 80,
 *     "satisfaction": 4
 *   },
 *   "feedback": {
 *     "helpful": true,
 *     "relevant": true,
 *     "difficulty": "just_right",
 *     "comments": "Great recommendation!"
 *   }
 * }
 */
async function putHandler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate feedback data
    const feedbackSchema = z.object({
      memoryId: z.string(),
      userAction: z.enum(['accepted', 'rejected', 'modified', 'ignored']),
      actualOutcome: z.object({
        subjectStudied: z.string(),
        duration: z.number(),
        xpEarned: z.number(),
        accuracy: z.number(),
        satisfaction: z.number().min(1).max(5),
        timestamp: z.string()
      }),
      feedback: z.object({
        helpful: z.boolean(),
        relevant: z.boolean(),
        difficulty: z.enum(['too_easy', 'just_right', 'too_hard']),
        comments: z.string().optional()
      })
    });

    const validationResult = feedbackSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid feedback data',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    const feedbackData = validationResult.data;

    // Process feedback through feedback loop
    const feedbackResult = await AIFeedbackLoop.processFeedback({
      userId: user.uid,
      ...feedbackData,
      performanceMetrics: {
        improvementRate: 0, // Would be calculated
        adherenceRate: feedbackData.userAction === 'accepted' ? 1 : 0,
        effectivenessScore: 0 // Would be calculated
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        feedbackProcessed: true,
        insights: feedbackResult.insights,
        adjustments: feedbackResult.adjustments,
        metadata: {
          memoryId: feedbackData.memoryId,
          userAction: feedbackData.userAction,
          processedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('AI Coach feedback error:', error);

    return NextResponse.json({
      error: 'Failed to process feedback',
      code: 'AI_COACH_FEEDBACK_ERROR'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/coach/cache
 * 
 * Clear user's AI cache
 */
async function deleteHandler(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    await AICacheManager.invalidateUserCache(user.uid);

    return NextResponse.json({
      success: true,
      data: {
        cacheCleared: true,
        userId: user.uid,
        clearedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI Coach cache clear error:', error);

    return NextResponse.json({
      error: 'Failed to clear cache',
      code: 'AI_COACH_CACHE_ERROR'
    }, { status: 500 });
  }
}

// Apply authentication and rate limiting
export const POST = withAuth(withTieredRateLimit('ai_coach')(handler));
export const GET = withAuth(withTieredRateLimit('ai_coach')(getHandler));
export const PUT = withAuth(withTieredRateLimit('ai_coach')(putHandler));
export const DELETE = withAuth(withTieredRateLimit('ai_coach')(deleteHandler));
