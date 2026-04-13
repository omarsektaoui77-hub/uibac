import { NextRequest, NextResponse } from 'next/server';
import { batchPipeline } from '@/app/lib/batchPipeline';
import { DRIVE_LAYOUT } from '@/app/lib/driveLayout';
import { cacheManager } from '@/app/lib/aggressiveCache';
import { localAI } from '@/app/lib/localAI';
import { fallbackAI } from '@/app/lib/fallbackAI';

export async function GET() {
  console.log('Starting Zero-Cost Pipeline run...');
  
  try {
    const startTime = Date.now();
    
    // Check system status
    const aiAvailable = await localAI.isAvailable();
    const fallbackStatus = fallbackAI.getStatus();
    
    console.log(`AI Available: ${aiAvailable}, Fallback Available: ${fallbackStatus.available}`);
    
    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      questionsGenerated: 0,
      costSaved: 0,
      aiUsed: false,
      fallbackUsed: false,
      processingTime: 0,
      details: [] as any[]
    };

    // Get folders to process
    const folders = [
      { id: DRIVE_LAYOUT.common, trackId: 'common', subjects: ['islamic_studies', 'french', 'arabic'] },
      { id: DRIVE_LAYOUT.tracks.sm, trackId: 'sm', subjects: ['advanced_math', 'physics_chemistry'] },
      { id: DRIVE_LAYOUT.tracks.svt, trackId: 'svt', subjects: ['biology'] },
      { id: DRIVE_LAYOUT.tracks.pc, trackId: 'pc', subjects: ['physics'] },
      { id: DRIVE_LAYOUT.tracks.lettres, trackId: 'lettres', subjects: ['literature'] }
    ];

    // Process each folder
    for (const folder of folders) {
      if (!folder.id || folder.id.includes('FOLDER_ID')) {
        console.log(`Skipping ${folder.trackId} - folder ID not configured`);
        results.skipped++;
        continue;
      }

      try {
        const folderResult = await processFolderZeroCost(folder, results, aiAvailable);
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

    results.processingTime = Date.now() - startTime;
    
    console.log(`Zero-Cost Pipeline completed: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors`);
    console.log(`Total cost saved: $${results.costSaved.toFixed(4)}`);

    return NextResponse.json({
      status: "zero-cost pipeline completed",
      timestamp: new Date().toISOString(),
      results,
      systemInfo: {
        aiAvailable,
        fallbackAvailable: fallbackStatus.available,
        cacheStats: cacheManager.getAllStats()
      }
    });

  } catch (error) {
    console.error('Zero-Cost Pipeline run failed:', error);
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

async function processFolderZeroCost(folder: any, results: any, aiAvailable: boolean) {
  console.log(`Processing folder: ${folder.trackId} (Zero-Cost Mode)`);
  
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
    questionsGenerated: 0,
    costSaved: 0,
    aiUsed: false,
    fallbackUsed: false,
    files: [] as any[]
  };

  // Process files in batch (zero-cost approach)
  const batchSize = Math.min(3, files.length); // Smaller batches for cost efficiency
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    try {
      // Use batch pipeline for maximum efficiency
      const batchResult = await batchPipeline.processBatch(batch, folder.trackId, 'en');
      
      // Update folder results
      folderResult.processed += batchResult.processed;
      folderResult.skipped += batchResult.skipped;
      folderResult.errors += batchResult.errors;
      folderResult.questionsGenerated += batchResult.questionsGenerated;
      folderResult.costSaved += batchResult.costSaved;
      
      // Track AI usage
      if (aiAvailable && batchResult.processed > 0) {
        folderResult.aiUsed = true;
        results.aiUsed = true;
      } else {
        folderResult.fallbackUsed = true;
        results.fallbackUsed = true;
      }
      
      folderResult.files.push(...batchResult.details);
      
      // Update global results
      results.processed += batchResult.processed;
      results.skipped += batchResult.skipped;
      results.errors += batchResult.errors;
      results.questionsGenerated += batchResult.questionsGenerated;
      results.costSaved += batchResult.costSaved;
      
      // Add delay to avoid overwhelming the system
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`Error processing batch in folder ${folder.trackId}:`, error);
      folderResult.errors++;
      results.errors++;
      
      folderResult.files.push({
        batchStartIndex: i,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return folderResult;
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

// POST endpoint for manual triggering with specific options
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, subjectId, language = 'en', forceRegenerate = false, useFallback = false } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      );
    }

    console.log(`Manual zero-cost pipeline trigger: ${trackId}, language: ${language}, fallback: ${useFallback}`);

    // Get folder ID
    const folderId = getFolderId(trackId);
    if (!folderId) {
      return NextResponse.json(
        { error: `No folder configured for track: ${trackId}` },
        { status: 404 }
      );
    }

    // Fetch files
    const files = await fetchDriveFiles(folderId);
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No PDF files found in the specified folder' },
        { status: 404 }
      );
    }

    // Process with zero-cost pipeline
    const result = await batchPipeline.processBatch(files, trackId, language);

    return NextResponse.json({
      success: true,
      message: `Zero-cost processing completed for ${trackId}`,
      result,
      metadata: {
        trackId,
        language,
        filesProcessed: files.length,
        useFallback,
        forceRegenerate
      }
    });

  } catch (error) {
    console.error('Manual zero-cost pipeline trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger zero-cost pipeline' },
      { status: 500 }
    );
  }
}

function getFolderId(trackId: string): string | null {
  const trackFolderMap: Record<string, string> = {
    'common': DRIVE_LAYOUT.common,
    'sm': DRIVE_LAYOUT.tracks.sm,
    'svt': DRIVE_LAYOUT.tracks.svt,
    'pc': DRIVE_LAYOUT.tracks.pc,
    'lettres': DRIVE_LAYOUT.tracks.lettres
  };

  return trackFolderMap[trackId] || null;
}
