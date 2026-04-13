// Zero-Cost Batch Processing Pipeline
// Processes multiple PDFs in single AI calls with maximum efficiency

import { localAI } from './localAI';
import { zeroCostAI } from './zeroCostAI';
import { fallbackAI } from './fallbackAI';
import { singleLanguageAI } from './singleLanguageAI';
import { cacheManager } from './aggressiveCache';
import { QuestionBankService } from './database';

export interface BatchProcessResult {
  processed: number;
  skipped: number;
  errors: number;
  questionsGenerated: number;
  costSaved: number;
  details: BatchFileResult[];
}

export interface BatchFileResult {
  fileId: string;
  fileName: string;
  status: 'processed' | 'skipped' | 'error';
  questionsGenerated: number;
  concepts?: string[];
  error?: string;
}

/**
 * Batch processing pipeline for maximum cost efficiency
 */
export class BatchPipeline {
  private batchSize = 5; // Process 5 files at once
  private maxTokensPerBatch = 2000; // Aggressive token limit

  /**
   * Process multiple files in batch
   */
  async processBatch(files: any[], trackId: string, language: string = 'en'): Promise<BatchProcessResult> {
    console.log(`Starting batch processing for ${files.length} files`);
    
    const result: BatchProcessResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      questionsGenerated: 0,
      costSaved: 0,
      details: []
    };

    // Filter files that need processing
    const filesToProcess = await this.filterUnprocessedFiles(files);
    
    if (filesToProcess.length === 0) {
      console.log('All files already processed');
      return {
        ...result,
        skipped: files.length,
        details: files.map(f => ({
          fileId: f.id,
          fileName: f.name,
          status: 'skipped' as const,
          questionsGenerated: 0
        }))
      };
    }

    // Process in batches
    for (let i = 0; i < filesToProcess.length; i += this.batchSize) {
      const batch = filesToProcess.slice(i, i + this.batchSize);
      const batchResult = await this.processBatchFiles(batch, trackId, language);
      
      // Aggregate results
      result.processed += batchResult.processed;
      result.skipped += batchResult.skipped;
      result.errors += batchResult.errors;
      result.questionsGenerated += batchResult.questionsGenerated;
      result.details.push(...batchResult.details);
      
      // Add delay to avoid overwhelming local AI
      if (i + this.batchSize < filesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Calculate cost savings (estimated)
    result.costSaved = this.calculateCostSavings(result.processed);

    console.log(`Batch processing complete: ${result.processed} processed, ${result.skipped} skipped, ${result.errors} errors`);
    
    return result;
  }

  /**
   * Filter files that haven't been processed yet
   */
  private async filterUnprocessedFiles(files: any[]): Promise<any[]> {
    const unprocessed: any[] = [];
    
    for (const file of files) {
      const isProcessed = cacheManager.isFileProcessed(file.id) || 
                         await QuestionBankService.fileProcessed(file.id);
      
      if (!isProcessed) {
        unprocessed.push(file);
      }
    }
    
    return unprocessed;
  }

  /**
   * Process a batch of files together
   */
  private async processBatchFiles(files: any[], trackId: string, language: string): Promise<BatchProcessResult> {
    const result: BatchProcessResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      questionsGenerated: 0,
      costSaved: 0,
      details: []
    };

    // Extract text from all files first
    const textData = await this.extractBatchText(files);
    
    // Analyze all texts in batch
    const analyses = await this.analyzeBatchTexts(textData);
    
    // Generate questions from all analyses
    const questionSets = await this.generateBatchQuestions(analyses, language);
    
    // Save results
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const analysis = analyses[i];
      const questions = questionSets[i];
      
      try {
        if (analysis && questions.length > 0) {
          await this.saveResults(file, trackId, analysis, questions, language);
          
          result.details.push({
            fileId: file.id,
            fileName: file.name,
            status: 'processed',
            questionsGenerated: questions.length,
            concepts: analysis.concepts
          });
          
          result.processed++;
          result.questionsGenerated += questions.length;
        } else {
          result.details.push({
            fileId: file.id,
            fileName: file.name,
            status: 'error',
            questionsGenerated: 0,
            error: 'Failed to generate content'
          });
          
          result.errors++;
        }
      } catch (error) {
        console.error(`Error saving results for ${file.name}:`, error);
        
        result.details.push({
          fileId: file.id,
          fileName: file.name,
          status: 'error',
          questionsGenerated: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        result.errors++;
      }
    }

    return result;
  }

  /**
   * Extract text from multiple files efficiently
   */
  private async extractBatchText(files: any[]): Promise<string[]> {
    const texts: string[] = [];
    
    for (const file of files) {
      try {
        // Check cache first
        const cachedText = cacheManager.getPDFText(file.id);
        if (cachedText) {
          texts.push(cachedText);
          continue;
        }

        // Extract text
        const text = await this.extractPDFText(file);
        
        // Cache aggressively
        cacheManager.cachePDFText(file.id, text);
        texts.push(text);
        
      } catch (error) {
        console.error(`Error extracting text from ${file.name}:`, error);
        texts.push(''); // Empty text for failed extraction
      }
    }
    
    return texts;
  }

  /**
   * Analyze multiple texts in batch (single AI call if possible)
   */
  private async analyzeBatchTexts(texts: string[]): Promise<any[]> {
    const analyses: any[] = [];
    
    // Try batch analysis first
    if (await localAI.isAvailable()) {
      try {
        const batchAnalysis = await this.performBatchAnalysis(texts);
        if (batchAnalysis) {
          return batchAnalysis;
        }
      } catch (error) {
        console.log('Batch analysis failed, falling back to individual analysis:', error);
      }
    }
    
    // Fallback to individual analysis
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text) {
        analyses.push(null);
        continue;
      }

      try {
        // Check cache
        const cacheKey = `analysis_${i}`;
        const cached = cacheManager.getAnalysis(cacheKey);
        if (cached) {
          analyses.push(cached);
          continue;
        }

        // Perform analysis
        const analysis = await zeroCostAI.analyzeContent(text, `batch_${i}`);
        
        // Cache result
        cacheManager.cacheAnalysis(cacheKey, analysis);
        analyses.push(analysis);
        
      } catch (error) {
        console.error(`Error analyzing text ${i}:`, error);
        analyses.push(null);
      }
    }
    
    return analyses;
  }

  /**
   * Perform batch analysis in single AI call
   */
  private async performBatchAnalysis(texts: string[]): Promise<any[] | null> {
    // Combine texts with markers
    const combinedText = texts.map((text, i) => 
      `DOCUMENT ${i + 1}:\n${text.substring(0, 500)}\n---END---`
    ).join('\n');

    const prompt = `Analyze each document. JSON array:
[
  {"concepts": ["c1","c2"], "difficulty": "medium", "summary": "short"},
  ...
]

${combinedText}`;

    try {
      const response = await localAI.call(prompt);
      if (response.success && response.response) {
        const parsed = JSON.parse(response.response);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (error) {
      console.error('Batch analysis failed:', error);
    }
    
    return null;
  }

  /**
   * Generate questions for all analyses
   */
  private async generateBatchQuestions(analyses: any[], language: string): Promise<any[][]> {
    const questionSets: any[][] = [];
    
    // Collect all concepts
    const allConcepts: string[] = [];
    const difficulties: string[] = [];
    
    for (const analysis of analyses) {
      if (analysis && analysis.concepts) {
        allConcepts.push(...analysis.concepts);
        difficulties.push(analysis.difficulty || 'medium');
      }
    }

    // Generate questions in batch for common concepts
    const uniqueConcepts = [...new Set(allConcepts)];
    const commonDifficulty = difficulties[0] || 'medium';
    
    if (uniqueConcepts.length > 0) {
      try {
        // Generate base questions once
        const baseQuestions = await singleLanguageAI.generateQuestionsBase(uniqueConcepts, commonDifficulty);
        
        // Distribute questions among analyses
        for (let i = 0; i < analyses.length; i++) {
          const analysis = analyses[i];
          if (analysis && analysis.concepts) {
            // Translate to target language
            const translated = singleLanguageAI.translateQuestions(baseQuestions, language);
            questionSets.push(translated.slice(0, 3)); // 3 questions per file
          } else {
            questionSets.push([]);
          }
        }
        
        return questionSets;
      } catch (error) {
        console.log('Batch question generation failed, using individual generation:', error);
      }
    }
    
    // Fallback to individual generation
    for (const analysis of analyses) {
      if (analysis && analysis.concepts) {
        try {
          const questions = await singleLanguageAI.generateAndTranslate(
            analysis.concepts, 
            analysis.difficulty || 'medium', 
            language
          );
          questionSets.push(questions);
        } catch (error) {
          console.error('Error generating questions:', error);
          questionSets.push([]);
        }
      } else {
        questionSets.push([]);
      }
    }
    
    return questionSets;
  }

  /**
   * Extract PDF text
   */
  private async extractPDFText(file: any): Promise<string> {
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

      return data.text || '';
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw error;
    }
  }

  /**
   * Save results to database
   */
  private async saveResults(
    file: any, 
    trackId: string, 
    analysis: any, 
    questions: any[], 
    language: string
  ): Promise<void> {
    const questionBankData = {
      trackId: trackId as any,
      subjectId: 'general',
      fileId: file.id,
      fileName: file.name,
      source: 'drive' as const,
      difficulty: analysis.difficulty,
      language: language as any,
      questions: questions.map(q => ({
        ...q,
        concept: analysis.concepts[0] || 'General',
        difficulty: analysis.difficulty
      })),
      concepts: analysis.concepts,
      summary: analysis.summary,
      version: 1
    };

    await QuestionBankService.saveQuestionBank(questionBankData);
    
    // Cache results
    cacheManager.cacheAnalysis(file.id, analysis);
    cacheManager.cacheQuestions(`${trackId}_general`, questions);
  }

  /**
   * Calculate estimated cost savings
   */
  private calculateCostSavings(processedFiles: number): number {
    // Estimate: $0.01 per analysis + $0.005 per question generation
    // Traditional approach: 2 AI calls per file
    // Batch approach: 1 AI call per batch + reuse
    const traditionalCost = processedFiles * 0.015; // $0.015 per file
    const batchCost = Math.ceil(processedFiles / this.batchSize) * 0.01; // $0.01 per batch
    
    return Math.max(0, traditionalCost - batchCost);
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(): Promise<{
    cacheStats: any;
    aiAvailable: boolean;
    costSavings: number;
  }> {
    return {
      cacheStats: cacheManager.getAllStats(),
      aiAvailable: await localAI.isAvailable(),
      costSavings: this.calculateCostSavings(10) // Sample calculation
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    cacheManager.clearAll();
  }
}

// Export singleton
export const batchPipeline = new BatchPipeline();
