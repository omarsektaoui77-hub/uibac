import { NextRequest, NextResponse } from 'next/server';
import { ProductionPipeline } from '@/app/lib/productionPipeline';
import { DRIVE_LAYOUT } from '@/app/lib/driveLayout';
import { ProductionDatabaseService } from '@/app/lib/productionSchema';

export async function GET() {
  console.log('Starting Production-Grade Pipeline run...');
  
  try {
    const startTime = Date.now();
    
    // Check system health
    const healthStatus = await ProductionPipeline.getHealthStatus();
    console.log('System health:', healthStatus);
    
    if (!healthStatus.healthy) {
      console.warn('System health check failed, but proceeding with fallbacks');
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      questionsGenerated: 0,
      averageQuality: 0,
      totalProcessingTime: 0,
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

    // Process each folder with production-grade pipeline
    for (const folder of folders) {
      if (!folder.id || folder.id.includes('FOLDER_ID')) {
        console.log(`Skipping ${folder.trackId} - folder ID not configured`);
        results.skipped++;
        continue;
      }

      try {
        const folderResult = await processFolderProduction(folder, results);
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

    results.totalProcessingTime = Date.now() - startTime;
    
    console.log(`Production Pipeline completed: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors`);
    console.log(`Average quality score: ${results.averageQuality.toFixed(2)}`);

    return NextResponse.json({
      status: "production pipeline completed",
      timestamp: new Date().toISOString(),
      results,
      systemInfo: {
        health: healthStatus,
        processingStats: await ProductionDatabaseService.getProcessingStats()
      }
    });

  } catch (error) {
    console.error('Production Pipeline run failed:', error);
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

async function processFolderProduction(folder: any, results: any) {
  console.log(`Processing folder: ${folder.trackId} (Production Mode)`);
  
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
    averageQuality: 0,
    totalProcessingTime: 0,
    qualityScores: [] as number[],
    files: [] as any[]
  };

  // Process files with production pipeline (limit to 3 for performance)
  const filesToProcess = files.slice(0, 3);
  
  for (const file of filesToProcess) {
    try {
      const config = {
        trackId: folder.trackId,
        subjectId: 'general',
        language: 'en' as const,
        qualityThreshold: 70,
        enableRetry: true,
        enableFallback: true,
        maxQuestions: 3
      };

      const pipelineResult = await ProductionPipeline.processFile(file, config);
      
      if (pipelineResult.success) {
        folderResult.processed++;
        folderResult.questionsGenerated += pipelineResult.contextObject?.questions.length || 0;
        folderResult.qualityScores.push(pipelineResult.qualityMetrics.averageQuestionScore);
        
        results.processed++;
        results.questionsGenerated += pipelineResult.contextObject?.questions.length || 0;
        
        folderResult.files.push({
          fileId: file.id,
          fileName: file.name,
          status: 'processed',
          questionsGenerated: pipelineResult.contextObject?.questions.length || 0,
          qualityScore: pipelineResult.qualityMetrics.averageQuestionScore,
          processingTime: pipelineResult.processingMetrics.totalTime
        });
        
      } else {
        folderResult.errors++;
        results.errors++;
        
        folderResult.files.push({
          fileId: file.id,
          fileName: file.name,
          status: 'error',
          error: pipelineResult.error?.message
        });
      }
      
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      folderResult.errors++;
      results.errors++;
      
      folderResult.files.push({
        fileId: file.id,
        fileName: file.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Calculate average quality
  if (folderResult.qualityScores.length > 0) {
    folderResult.averageQuality = folderResult.qualityScores.reduce((sum: number, score: number) => sum + score, 0) / folderResult.qualityScores.length;
  }

  // Update global average quality
  if (results.questionsGenerated > 0) {
    const allQualityScores = results.details
      .filter((d: any) => d.averageQuality)
      .map((d: any) => d.averageQuality);
    
    if (allQualityScores.length > 0) {
      results.averageQuality = allQualityScores.reduce((sum: number, score: number) => sum + score, 0) / allQualityScores.length;
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
    const { 
      trackId, 
      subjectId, 
      language = 'en', 
      qualityThreshold = 70,
      enableRetry = true,
      enableFallback = true,
      maxQuestions = 5,
      fileIds 
    } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      );
    }

    console.log(`Manual production pipeline trigger: ${trackId}, quality: ${qualityThreshold}, retry: ${enableRetry}`);

    // Get folder ID
    const folderId = getFolderId(trackId);
    if (!folderId) {
      return NextResponse.json(
        { error: `No folder configured for track: ${trackId}` },
        { status: 404 }
      );
    }

    // Fetch files
    const allFiles = await fetchDriveFiles(folderId);
    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: 'No PDF files found in the specified folder' },
        { status: 404 }
      );
    }

    // Filter files if specific fileIds provided
    const filesToProcess = fileIds 
      ? allFiles.filter(file => fileIds.includes(file.id))
      : allFiles.slice(0, 5); // Limit to 5 files for manual processing

    if (filesToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No matching files found' },
        { status: 404 }
      );
    }

    // Process with production pipeline
    const config = {
      trackId,
      subjectId: subjectId || 'general',
      language,
      qualityThreshold,
      enableRetry,
      enableFallback,
      maxQuestions
    };

    const pipelineResults = await ProductionPipeline.processBatch(filesToProcess, config);

    // Aggregate results
    const successfulResults = pipelineResults.filter(r => r.success);
    const failedResults = pipelineResults.filter(r => !r.success);

    const summary = {
      success: successfulResults.length > 0,
      totalFiles: filesToProcess.length,
      processed: successfulResults.length,
      failed: failedResults.length,
      totalQuestions: successfulResults.reduce((sum, r) => sum + (r.contextObject?.questions.length || 0), 0),
      averageQuality: successfulResults.length > 0 
        ? successfulResults.reduce((sum, r) => sum + r.qualityMetrics.averageQuestionScore, 0) / successfulResults.length
        : 0,
      totalProcessingTime: pipelineResults.reduce((sum, r) => sum + r.processingMetrics.totalTime, 0),
      results: pipelineResults
    };

    return NextResponse.json({
      success: summary.success,
      message: `Production processing completed for ${trackId}`,
      summary,
      config
    });

  } catch (error) {
    console.error('Manual production pipeline trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger production pipeline' },
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
