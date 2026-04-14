// Production-Grade AI Question Generation Pipeline
// Integrates all four robustness layers: Sanitization, Validation, Resiliency, and Concept Storage

import { DataSanitization } from './dataSanitization';
import { ValidationSystem, QuestionValidation } from './validation';
import { ContextObject } from './productionSchema';
import { ResiliencySystem, RetryConfigs, CircuitBreakerConfigs } from './resiliency';
import { ProductionDatabaseService, ProductionQuestionBank, ProductionQuestion } from './productionSchema';
import { localAI } from './localAI';
import { fallbackAI } from './fallbackAI';
import { singleLanguageAI } from './singleLanguageAI';
import { cacheManager } from './aggressiveCache';

export interface ProductionPipelineConfig {
  trackId: string;
  subjectId: string;
  language: 'ar' | 'en' | 'fr' | 'es';
  qualityThreshold: number;
  enableRetry: boolean;
  enableFallback: boolean;
  maxQuestions: number;
}

export interface ProductionResult {
  success: boolean;
  questionBankId?: string;
  contextObject?: ContextObject;
  processingMetrics: {
    totalTime: number;
    sanitizationTime: number;
    analysisTime: number;
    generationTime: number;
    validationTime: number;
    storageTime: number;
    retryAttempts: number;
    cacheHits: number;
  };
  qualityMetrics: {
    averageQuestionScore: number;
    validationPassed: boolean;
    warnings: string[];
    errors: string[];
  };
  error?: Error;
}

/**
 * Production-grade pipeline with all robustness layers
 */
export class ProductionPipeline {
  private static readonly DEFAULT_CONFIG: Partial<ProductionPipelineConfig> = {
    qualityThreshold: 70,
    enableRetry: true,
    enableFallback: true,
    maxQuestions: 5
  };

  /**
   * Main production pipeline entry point
   */
  static async processFile(
    file: any,
    config: ProductionPipelineConfig
  ): Promise<ProductionResult> {
    const startTime = Date.now();
    const processingMetrics = {
      totalTime: 0,
      sanitizationTime: 0,
      analysisTime: 0,
      generationTime: 0,
      validationTime: 0,
      storageTime: 0,
      retryAttempts: 0,
      cacheHits: 0
    };

    const qualityMetrics = {
      averageQuestionScore: 0,
      validationPassed: false,
      warnings: [] as string[],
      errors: [] as string[]
    };

    try {
      console.log(`Starting production pipeline for ${file.name}`);

      // Step 1: Check if already processed
      const existing = await this.checkExistingProcessing(file.id, config.trackId, config.subjectId);
      if (existing) {
        console.log(`File ${file.name} already processed, returning cached result`);
        return {
          success: true,
          questionBankId: existing.id,
          contextObject: existing.context,
          processingMetrics: { ...processingMetrics, totalTime: Date.now() - startTime },
          qualityMetrics: {
            ...qualityMetrics,
            averageQuestionScore: existing.context.metadata.qualityMetrics.averageQuestionScore,
            validationPassed: existing.context.metadata.qualityMetrics.validationPassed,
            warnings: existing.context.metadata.qualityMetrics.warnings,
            errors: existing.context.metadata.qualityMetrics.errors
          }
        };
      }

      // Step 2: Extract and sanitize PDF text
      const sanitizationResult = await this.extractAndSanitizeText(file);
      processingMetrics.sanitizationTime = Date.now() - startTime;

      if (!sanitizationResult.cleanedText || sanitizationResult.cleanedText.length < 50) {
        throw new Error('Insufficient text content after sanitization');
      }

      // Step 3: Analyze content with resiliency
      const analysisResult = await this.analyzeContentWithResiliency(
        sanitizationResult.cleanedText,
        file.id,
        config
      );
      processingMetrics.analysisTime = Date.now() - startTime - processingMetrics.sanitizationTime;

      // Step 4: Generate questions with validation
      const generationResult = await this.generateQuestionsWithValidation(
        analysisResult.concepts,
        analysisResult.difficulty,
        config,
        file.id
      );
      processingMetrics.generationTime = Date.now() - startTime - processingMetrics.analysisTime - processingMetrics.sanitizationTime;

      // Step 5: Validate complete context object
      const validationResult = await this.validateContextObject(
        analysisResult,
        generationResult.questions,
        config
      );
      processingMetrics.validationTime = Date.now() - startTime - processingMetrics.generationTime - processingMetrics.analysisTime - processingMetrics.sanitizationTime;

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: context object validation did not pass`);
      }

      // Step 6: Store with metadata
      const storageResult = await this.storeContextObject(
        validationResult.contextObject,
        file,
        config,
        processingMetrics,
        qualityMetrics
      );
      processingMetrics.storageTime = Date.now() - startTime - processingMetrics.validationTime - processingMetrics.generationTime - processingMetrics.analysisTime - processingMetrics.sanitizationTime;

      processingMetrics.totalTime = Date.now() - startTime;

      console.log(`Production pipeline completed for ${file.name} in ${processingMetrics.totalTime}ms`);

      return {
        success: true,
        questionBankId: storageResult,
        contextObject: validationResult.contextObject,
        processingMetrics,
        qualityMetrics: {
          ...qualityMetrics,
          averageQuestionScore: validationResult.contextObject.metadata.qualityMetrics.averageQuestionScore,
          validationPassed: validationResult.contextObject.metadata.qualityMetrics.validationPassed,
          warnings: validationResult.contextObject.metadata.qualityMetrics.warnings,
          errors: validationResult.contextObject.metadata.qualityMetrics.errors
        }
      };

    } catch (error) {
      processingMetrics.totalTime = Date.now() - startTime;
      
      console.error(`Production pipeline failed for ${file.name}:`, error);
      
      // Log failure
      await ProductionDatabaseService.logProcessing(
        'production_pipeline',
        'failed',
        { operationType: 'generation' },
        { fileId: file.id, trackId: config.trackId, subjectId: config.subjectId, error: error instanceof Error ? error.message : String(error) }
      );

      return {
        success: false,
        processingMetrics,
        qualityMetrics,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Check if file already processed
   */
  private static async checkExistingProcessing(
    fileId: string,
    trackId: string,
    subjectId: string
  ): Promise<ProductionQuestionBank | null> {
    try {
      return await ProductionDatabaseService.getContextObject(trackId, subjectId, fileId);
    } catch (error) {
      console.log('Error checking existing processing:', error);
      return null;
    }
  }

  /**
   * Extract and sanitize PDF text
   */
  private static async extractAndSanitizeText(file: any): Promise<any> {
    // Check cache first
    const cachedText = cacheManager.getPDFText(file.id);
    if (cachedText) {
      return DataSanitization.sanitizePDFText(cachedText);
    }

    // Extract text from PDF
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pdf/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: file.webViewLink })
    });

    if (!response.ok) {
      throw new Error(`PDF extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.text || '';

    // Sanitize text
    const sanitized = DataSanitization.sanitizePDFText(rawText);
    
    // Cache sanitized text
    cacheManager.cachePDFText(file.id, sanitized.cleanedText);

    return sanitized;
  }

  /**
   * Analyze content with resiliency and fallback
   */
  private static async analyzeContentWithResiliency(
    text: string,
    fileId: string,
    config: ProductionPipelineConfig
  ): Promise<any> {
    // Check cache first
    const cachedAnalysis = cacheManager.getAnalysis(fileId);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    const operations = [
      {
        name: 'local_ai_analysis',
        fn: async () => {
          const prompt = `Analyze Moroccan lesson. JSON:
{
  "concepts": ["c1","c2"],
  "difficulty": "Easy|Medium|Hard",
  "summary": "short"
}

${text.substring(0, 2000)}`;

          const response = await localAI.call(prompt);
          if (!response.success) {
            throw new Error(response.error || 'Local AI analysis failed');
          }

          const analysis = JSON.parse(response.response!);
          return {
            concepts: Array.isArray(analysis.concepts) ? analysis.concepts : ['General'],
            difficulty: analysis.difficulty || 'Medium',
            summary: analysis.summary || 'Lesson content'
          };
        },
        validator: (result: any) => ValidationSystem.validateContextObject({
          concepts: result.concepts,
          summary: result.summary,
          difficulty: result.difficulty,
          questions: []
        })
      },
      {
        name: 'fallback_analysis',
        fn: async () => fallbackAI.analyzeContent(text, fileId)
      }
    ];

    const result = await ResiliencySystem.executeWithFallback(
      operations,
      RetryConfigs.LOCAL_AI
    );

    if (!result.success) {
      throw new Error(`All analysis methods failed: ${result.error?.message}`);
    }

    // Cache result
    cacheManager.cacheAnalysis(fileId, result.result);

    return result.result;
  }

  /**
   * Generate questions with validation and quality filtering
   */
  private static async generateQuestionsWithValidation(
    concepts: string[],
    difficulty: string,
    config: ProductionPipelineConfig,
    fileId: string
  ): Promise<{ questions: ProductionQuestion[]; validationResults: any[] }> {
    const cacheKey = `${concepts.join('_')}_${difficulty}_${config.language}`;
    
    // Check cache first
    const cachedQuestions = cacheManager.getQuestions(cacheKey);
    if (cachedQuestions) {
      return { questions: cachedQuestions, validationResults: [] };
    }

    const operations = [
      {
        name: 'local_ai_generation',
        fn: async () => {
          const prompt = `Generate ${config.maxQuestions} questions. JSON:
[
  {
    "question": "text",
    "choices": ["A", "B", "C", "D"],
    "answer": "B",
    "explanation": "short",
    "xp": 20
  }
]

Concepts: ${concepts.slice(0, 3).join(', ')}
Difficulty: ${difficulty}`;

          const response = await localAI.call(prompt);
          if (!response.success) {
            throw new Error(response.error || 'Local AI generation failed');
          }

          const questions = JSON.parse(response.response!);
          return Array.isArray(questions) ? questions : [questions];
        }
      },
      {
        name: 'fallback_generation',
        fn: async () => fallbackAI.generateQuestions(concepts, difficulty, 'en')
      }
    ];

    const result = await ResiliencySystem.executeWithFallback(
      operations,
      RetryConfigs.LOCAL_AI
    );

    if (!result.success) {
      throw new Error(`All generation methods failed: ${result.error?.message}`);
    }

    const rawQuestions = result.result || [];

    // Validate and filter questions
    const validationResults: any[] = [];
    const validQuestions: ProductionQuestion[] = [];

    for (const question of rawQuestions) {
      const validation = ValidationSystem.validateQuestion(question);
      validationResults.push(validation);

      if (validation.isValid && validation.score >= config.qualityThreshold) {
        validQuestions.push({
          ...question,
          qualityScore: validation.score,
          metadata: {
            generatedAt: new Date().toISOString() as any,
            sourceModel: 'local_ai',
            processingTime: 0,
            retryCount: 0
          }
        });
      }
    }

    if (validQuestions.length === 0) {
      throw new Error('No questions passed quality validation');
    }

    // Translate if needed
    const finalQuestions = config.language === 'en' 
      ? validQuestions 
      : singleLanguageAI.translateQuestions(validQuestions, config.language);

    // Cache result
    cacheManager.cacheQuestions(cacheKey, finalQuestions);

    return { questions: finalQuestions, validationResults };
  }

  /**
   * Validate complete context object
   */
  private static async validateContextObject(
    analysis: any,
    questions: ProductionQuestion[],
    config: ProductionPipelineConfig
  ): Promise<{ isValid: boolean; contextObject: ContextObject }> {
    const contextObject: ContextObject = {
      concepts: analysis.concepts,
      summary: analysis.summary,
      difficulty: analysis.difficulty as 'Easy' | 'Medium' | 'Hard',
      questions,
      metadata: {
        sourceFileId: '', // Will be filled by caller
        sourceFileName: '', // Will be filled by caller
        trackId: config.trackId,
        subjectId: config.subjectId,
        language: config.language,
        processedAt: new Date().toISOString() as any,
        processingVersion: '1.0.0',
        qualityMetrics: {
          averageQuestionScore: questions.reduce((sum, q) => sum + (q.qualityScore || 0), 0) / questions.length,
          validationPassed: true,
          warnings: [],
          errors: []
        },
        performanceMetrics: {
          totalProcessingTime: 0, // Will be filled by caller
          aiCallCount: 1,
          cacheHitRate: 0,
          retryAttempts: 0
        }
      }
    };

    const validation = ValidationSystem.validateContextObject(contextObject);
    
    return {
      isValid: validation.isValid,
      contextObject
    };
  }

  /**
   * Store context object with metadata
   */
  private static async storeContextObject(
    contextObject: ContextObject,
    file: any,
    config: ProductionPipelineConfig,
    processingMetrics: any,
    qualityMetrics: any
  ): Promise<string> {
    // Update metadata
    contextObject.metadata.sourceFileId = file.id;
    contextObject.metadata.sourceFileName = file.name;
    contextObject.metadata.performanceMetrics = {
      totalProcessingTime: processingMetrics.totalTime,
      aiCallCount: 1,
      cacheHitRate: processingMetrics.cacheHits / 5, // Approximate
      retryAttempts: processingMetrics.retryAttempts
    };
    contextObject.metadata.qualityMetrics = {
      averageQuestionScore: qualityMetrics.averageQuestionScore,
      validationPassed: qualityMetrics.validationPassed,
      warnings: qualityMetrics.warnings,
      errors: qualityMetrics.errors
    };

    // Store in database
    const questionBankId = await ProductionDatabaseService.saveContextObject(
      contextObject,
      config.trackId,
      config.subjectId
    );

    // Log success
    await ProductionDatabaseService.logProcessing(
      'production_pipeline',
      'completed',
      { operationType: 'generation', qualityScore: qualityMetrics.averageQuestionScore },
      { fileId: file.id, trackId: config.trackId, subjectId: config.subjectId }
    );

    return questionBankId;
  }

  /**
   * Batch process multiple files
   */
  static async processBatch(
    files: any[],
    config: ProductionPipelineConfig
  ): Promise<ProductionResult[]> {
    console.log(`Starting batch processing for ${files.length} files`);
    
    const results: ProductionResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const result = await this.processFile(file, config);
        results.push(result);
        
        // Add delay to prevent overwhelming the system
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        results.push({
          success: false,
          processingMetrics: {
            totalTime: 0,
            sanitizationTime: 0,
            analysisTime: 0,
            generationTime: 0,
            validationTime: 0,
            storageTime: 0,
            retryAttempts: 0,
            cacheHits: 0
          },
          qualityMetrics: {
            averageQuestionScore: 0,
            validationPassed: false,
            warnings: [],
            errors: [error instanceof Error ? error.message : String(error)]
          },
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }
    
    return results;
  }

  /**
   * Get pipeline health status
   */
  static async getHealthStatus(): Promise<{
    healthy: boolean;
    components: {
      localAI: boolean;
      database: boolean;
      cache: boolean;
      validation: boolean;
    };
    circuitBreakers: any;
    processingStats: any;
  }> {
    const localAIAvailable = await localAI.isAvailable();
    const fallbackStatus = fallbackAI.getStatus();
    const circuitBreakerStats = ResiliencySystem.getCircuitBreakerStats();
    const processingStats = await ProductionDatabaseService.getProcessingStats();
    const cacheStats = cacheManager.getAllStats();

    return {
      healthy: localAIAvailable && fallbackStatus.available,
      components: {
        localAI: localAIAvailable,
        database: true, // Assume healthy if we can call the method
        cache: Object.values(cacheStats).some(stats => stats.size > 0),
        validation: true // Always healthy
      },
      circuitBreakers: circuitBreakerStats,
      processingStats
    };
  }
}

export default ProductionPipeline;
