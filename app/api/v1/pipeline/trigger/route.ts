import { NextRequest, NextResponse } from 'next/server';
import { QuestionBankService } from '@/app/lib/database';
import { cache, CACHE_KEYS } from '@/app/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, subjectId, language = 'en', forceRegenerate = false } = body;

    if (!trackId || !subjectId) {
      return NextResponse.json(
        { error: 'trackId and subjectId are required' },
        { status: 400 }
      );
    }

    // Check cache first (unless force regeneration)
    const cacheKey = CACHE_KEYS.QUESTION_BANK(trackId, subjectId);
    if (!forceRegenerate) {
      const cachedBank = cache.get(cacheKey);
      if (cachedBank) {
        return NextResponse.json({
          success: true,
          message: 'Question bank retrieved from cache',
          data: cachedBank,
          cached: true
        });
      }

      // Check database
      const existingBank = await QuestionBankService.getQuestionBank(trackId, subjectId);
      if (existingBank) {
        // Cache the result
        cache.set(cacheKey, existingBank, 30 * 60 * 1000); // 30 minutes
        return NextResponse.json({
          success: true,
          message: 'Question bank retrieved from database',
          data: existingBank,
          cached: false
        });
      }
    }

    // Trigger the pipeline processing
    const pipelineResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pipeline/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, subjectId, language, forceRegenerate })
    });

    const pipelineData = await pipelineResponse.json();

    if (!pipelineResponse.ok) {
      return NextResponse.json(
        { error: pipelineData.error || 'Pipeline processing failed' },
        { status: pipelineResponse.status }
      );
    }

    // Cache the new question bank
    if (pipelineData.success && pipelineData.data) {
      cache.set(cacheKey, pipelineData.data, 30 * 60 * 1000); // 30 minutes
    }

    return NextResponse.json(pipelineData);

  } catch (error) {
    console.error('Pipeline trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger pipeline' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');
    const subjectId = searchParams.get('subjectId');

    if (!trackId || !subjectId) {
      return NextResponse.json(
        { error: 'trackId and subjectId are required' },
        { status: 400 }
      );
    }

    // Check if question bank exists
    const exists = await QuestionBankService.questionBankExists(trackId, subjectId);
    
    // Get cache status
    const cacheKey = CACHE_KEYS.QUESTION_BANK(trackId, subjectId);
    const cached = cache.get(cacheKey) !== null;

    return NextResponse.json({
      exists,
      cached,
      message: exists ? 'Question bank is available' : 'Question bank needs to be generated'
    });

  } catch (error) {
    console.error('Pipeline status error:', error);
    return NextResponse.json(
      { error: 'Failed to check pipeline status' },
      { status: 500 }
    );
  }
}
