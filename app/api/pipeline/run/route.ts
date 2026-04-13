import { NextRequest, NextResponse } from 'next/server';
import { DRIVE_LAYOUT } from '@/app/lib/driveLayout';
import { QuestionBankService } from '@/app/lib/database';
import { cache, CACHE_KEYS } from '@/app/lib/cache';

export async function GET() {
  console.log('Starting automated pipeline run...');
  
  try {
    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Get all folders to process
    const folders = [
      { id: DRIVE_LAYOUT.common, trackId: 'common', subjects: ['islamic_studies', 'french', 'arabic', 'philosophy', 'history_geo'] },
      { id: DRIVE_LAYOUT.tracks.sm, trackId: 'sm', subjects: ['advanced_math', 'physics_chemistry', 'engineering_sciences_smb'] },
      { id: DRIVE_LAYOUT.tracks.svt, trackId: 'svt', subjects: ['biology', 'geology'] },
      { id: DRIVE_LAYOUT.tracks.pc, trackId: 'pc', subjects: ['physics', 'chemistry'] },
      { id: DRIVE_LAYOUT.tracks.lettres, trackId: 'lettres', subjects: ['literature', 'philosophy'] }
    ];

    // Process each folder
    for (const folder of folders) {
      if (!folder.id || folder.id.includes('FOLDER_ID')) {
        console.log(`Skipping ${folder.trackId} - folder ID not configured`);
        results.skipped++;
        continue;
      }

      try {
        const folderResult = await processFolder(folder, results);
        results.details.push(folderResult);
      } catch (error) {
        console.error(`Error processing folder ${folder.trackId}:`, error);
        results.errors++;
        results.details.push({
          trackId: folder.trackId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Pipeline completed: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors`);

    return NextResponse.json({
      status: "pipeline completed",
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('Pipeline run failed:', error);
    return NextResponse.json(
      { 
        status: "pipeline failed", 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function processFolder(folder: any, results: any) {
  console.log(`Processing folder: ${folder.trackId}`);
  
  // Get files from Google Drive
  const files = await fetchDriveFiles(folder.id);
  
  if (files.length === 0) {
    return {
      trackId: folder.trackId,
      status: "no_files",
      message: "No PDF files found"
    };
  }

  const folderResult = {
    trackId: folder.trackId,
    totalFiles: files.length,
    processed: 0,
    skipped: 0,
    errors: 0,
    files: [] as any[]
  };

  // Process each file
  for (const file of files.slice(0, 5)) { // Limit to 5 files per run to save costs
    try {
      // Check if file already processed
      const alreadyProcessed = await QuestionBankService.fileProcessed(file.id);
      
      if (alreadyProcessed) {
        console.log(`Skipping already processed file: ${file.name}`);
        folderResult.skipped++;
        results.skipped++;
        continue;
      }

      // Process the file
      const processResult = await processFile(file, folder.trackId, 'en'); // Default to English
      folderResult.files.push(processResult);
      folderResult.processed++;
      results.processed++;

      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      folderResult.errors++;
      results.errors++;
      folderResult.files.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return folderResult;
}

async function processFile(file: any, trackId: string, language: string) {
  console.log(`Processing file: ${file.name}`);

  // Extract text from PDF
  const text = await extractPDFText(file);
  
  // Analyze content
  const analysis = await analyzeContent(text, 'general', trackId);
  
  // Generate questions
  const questions = await generateQuestions(analysis.keyConcepts, analysis.difficulty, language);
  
  // Save to database with fileId to prevent duplicates
  const questionBankData = {
    trackId: trackId as any,
    subjectId: 'general', // You might want to extract this from file name or folder structure
    fileId: file.id,
    fileName: file.name,
    source: 'drive' as const,
    difficulty: analysis.difficulty,
    language: language as any,
    questions: questions.map(q => ({
      ...q,
      concept: analysis.keyConcepts[0] || 'General',
      difficulty: analysis.difficulty
    })),
    concepts: analysis.keyConcepts,
    summary: analysis.summary
  };

  const bankId = await QuestionBankService.saveQuestionBank(questionBankData);

  // Cache the result
  const cacheKey = CACHE_KEYS.QUESTION_BANK(trackId, 'general');
  cache.set(cacheKey, { id: bankId, ...questionBankData }, 30 * 60 * 1000);

  return {
    fileName: file.name,
    status: "success",
    questionsGenerated: questions.length,
    concepts: analysis.keyConcepts,
    difficulty: analysis.difficulty
  };
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

async function analyzeContent(text: string, subjectId: string, trackId: string): Promise<any> {
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

async function generateQuestions(concepts: string[], difficulty: string, language: string): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concepts,
        difficulty,
        language,
        subject: 'general',
        track: 'common'
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
