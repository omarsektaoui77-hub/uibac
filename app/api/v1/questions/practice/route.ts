import { NextRequest, NextResponse } from 'next/server';
import { QuestionBankService } from '@/app/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');
    const subjectId = searchParams.get('subjectId');
    const difficulty = searchParams.get('difficulty');
    const count = parseInt(searchParams.get('count') || '10');

    if (!trackId || !subjectId) {
      return NextResponse.json(
        { error: 'trackId and subjectId are required' },
        { status: 400 }
      );
    }

    // Get practice questions from database
    const questions = await QuestionBankService.getPracticeQuestions(
      trackId,
      subjectId,
      difficulty || undefined,
      count
    );

    if (questions.length === 0) {
      // Check if question bank exists but has no questions
      const bank = await QuestionBankService.getQuestionBank(trackId, subjectId);
      
      if (bank) {
        return NextResponse.json({
          success: true,
          message: 'Question bank exists but no questions match the criteria',
          questions: [],
          bankInfo: {
            totalQuestions: bank.questions.length,
            availableDifficulties: [...new Set(bank.questions.map(q => q.difficulty))],
            concepts: bank.concepts
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No question bank found for this track and subject. Please process the pipeline first.',
          questions: [],
          needsProcessing: true
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Retrieved ${questions.length} practice questions`,
      questions,
      metadata: {
        count: questions.length,
        difficulty: difficulty || 'mixed',
        trackId,
        subjectId
      }
    });

  } catch (error) {
    console.error('Practice questions error:', error);
    
    // Return mock questions for development
    if (process.env.NODE_ENV === 'development') {
      const mockQuestions = [
        {
          question: "What is the derivative of x²?",
          choices: ["2x", "x", "x²", "2"],
          answer: "A",
          explanation: "Using the power rule: d/dx(x²) = 2x^(2-1) = 2x",
          xp: 20,
          concept: "Derivatives",
          difficulty: "easy"
        },
        {
          question: "Find the limit of sin(x)/x as x approaches 0",
          choices: ["0", "1", "Infinity", "Undefined"],
          answer: "B",
          explanation: "This is a fundamental limit in calculus, proven using the squeeze theorem",
          xp: 30,
          concept: "Limits",
          difficulty: "medium"
        },
        {
          question: "Apply the chain rule to f(x) = sin(x²)",
          choices: ["2x*cos(x²)", "cos(x²)", "sin(2x)", "2*sin(x)"],
          answer: "A",
          explanation: "Chain rule: f'(x) = cos(x²) * 2x = 2x*cos(x²)",
          xp: 25,
          concept: "Chain Rule",
          difficulty: "medium"
        }
      ];

      return NextResponse.json({
        success: true,
        message: 'Mock questions for development',
        questions: mockQuestions,
        mock: true
      });
    }

    return NextResponse.json(
      { error: 'Failed to retrieve practice questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, subjectId, difficulty, count = 10 } = body;

    if (!trackId || !subjectId) {
      return NextResponse.json(
        { error: 'trackId and subjectId are required' },
        { status: 400 }
      );
    }

    // Get practice questions from database
    const questions = await QuestionBankService.getPracticeQuestions(
      trackId,
      subjectId,
      difficulty || undefined,
      count
    );

    return NextResponse.json({
      success: true,
      message: `Retrieved ${questions.length} practice questions`,
      questions
    });

  } catch (error) {
    console.error('Practice questions POST error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve practice questions' },
      { status: 500 }
    );
  }
}
