import { NextRequest, NextResponse } from 'next/server';
import { DRIVE_LAYOUT } from '@/app/lib/driveLayout';
import { QuestionBankService, QuestionBank, LessonAnalysis } from '@/app/lib/database';

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

    // Check if question bank already exists (unless force regeneration)
    if (!forceRegenerate) {
      const existingBank = await QuestionBankService.getQuestionBank(trackId, subjectId);
      if (existingBank) {
        return NextResponse.json({
          success: true,
          message: 'Question bank already exists',
          data: existingBank,
          cached: true
        });
      }
    }

    // Get folder ID from drive layout
    const folderId = getFolderId(trackId, subjectId);
    if (!folderId) {
      return NextResponse.json(
        { error: `No folder configured for track: ${trackId}, subject: ${subjectId}` },
        { status: 404 }
      );
    }

    // Step 1: Fetch PDF files from Google Drive
    const driveFiles = await fetchDriveFiles(folderId);
    if (driveFiles.length === 0) {
      return NextResponse.json(
        { error: 'No PDF files found in the specified folder' },
        { status: 404 }
      );
    }

    console.log(`Found ${driveFiles.length} PDF files to process`);

    // Step 2: Process each PDF and generate questions
    const allQuestions = [];
    const allConcepts = new Set<string>();
    let combinedSummary = '';

    for (const file of driveFiles.slice(0, 3)) { // Process max 3 files per request
      try {
        // Extract text from PDF
        const extractedText = await extractPDFText(file);
        
        // Analyze the content
        const analysis = await analyzeContent(extractedText, subjectId, trackId);
        
        // Generate questions based on analysis
        const questions = await generateQuestions(
          analysis.keyConcepts,
          analysis.difficulty,
          language,
          subjectId,
          trackId
        );

        // Add questions with metadata
        const enrichedQuestions = questions.map(q => ({
          ...q,
          concept: analysis.keyConcepts[0] || 'General',
          difficulty: analysis.difficulty,
          sourceFile: file.name
        }));

        allQuestions.push(...enrichedQuestions);
        analysis.keyConcepts.forEach(concept => allConcepts.add(concept));
        combinedSummary += analysis.summary + ' ';

        // Save lesson analysis for future reference
        await QuestionBankService.saveLessonAnalysis(trackId, subjectId, file.id, file.name, analysis);

        console.log(`Processed ${file.name}: Generated ${questions.length} questions`);

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        // Continue with other files even if one fails
      }
    }

    if (allQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any questions from the PDFs' },
        { status: 500 }
      );
    }

    // Step 3: Save to database
    const questionBank: Omit<QuestionBank, 'id' | 'createdAt' | 'updatedAt'> = {
      trackId: trackId as any,
      subjectId,
      source: 'drive',
      difficulty: determineOverallDifficulty(allQuestions),
      questions: allQuestions,
      concepts: Array.from(allConcepts),
      summary: combinedSummary.trim(),
      fileId: driveFiles[0].id,
      fileName: `${driveFiles.length} files processed`,
      language: 'en',
      version: 1
    };

    const bankId = await QuestionBankService.saveQuestionBank(questionBank);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${driveFiles.length} files and generated ${allQuestions.length} questions`,
      data: {
        id: bankId,
        ...questionBank,
        filesProcessed: driveFiles.length,
        questionsGenerated: allQuestions.length
      },
      cached: false
    });

  } catch (error) {
    console.error('Pipeline processing error:', error);
    return NextResponse.json(
      { error: 'Pipeline processing failed' },
      { status: 500 }
    );
  }
}

function getFolderId(trackId: string, subjectId: string): string | null {
  // Map track and subject to folder IDs
  // This is a simplified mapping - you might need more complex logic
  const trackFolderMap: Record<string, string> = {
    'sm': DRIVE_LAYOUT.tracks.sm,
    'svt': DRIVE_LAYOUT.tracks.svt,
    'pc': DRIVE_LAYOUT.tracks.pc,
    'lettres': DRIVE_LAYOUT.tracks.lettres,
    'common': DRIVE_LAYOUT.common
  };

  return trackFolderMap[trackId] || null;
}

async function fetchDriveFiles(folderId: string): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/drive/list?folderId=${folderId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch drive files');
    }

    return data.files || [];
  } catch (error) {
    console.error('Drive fetch error:', error);
    return [];
  }
}

async function extractPDFText(file: any): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pdf/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: file.webViewLink })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to extract PDF text');
    }

    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}

async function analyzeContent(text: string, subjectId: string, trackId: string): Promise<LessonAnalysis> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, subject: subjectId, track: trackId })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to analyze content');
    }

    return data;
  } catch (error) {
    console.error('Content analysis error:', error);
    throw error;
  }
}

async function generateQuestions(
  concepts: string[],
  difficulty: string,
  language: string,
  subjectId: string,
  trackId: string
): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concepts,
        difficulty,
        language,
        subject: subjectId,
        track: trackId
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate questions');
    }

    return data;
  } catch (error) {
    console.error('Question generation error:', error);
    throw error;
  }
}

function determineOverallDifficulty(questions: any[]): 'easy' | 'medium' | 'hard' {
  if (questions.length === 0) return 'medium';
  
  const difficulties = questions.map(q => q.difficulty || 'medium');
  const easyCount = difficulties.filter(d => d === 'easy').length;
  const mediumCount = difficulties.filter(d => d === 'medium').length;
  const hardCount = difficulties.filter(d => d === 'hard').length;
  
  if (hardCount > mediumCount && hardCount > easyCount) return 'hard';
  if (easyCount > mediumCount && easyCount > hardCount) return 'easy';
  return 'medium';
}
