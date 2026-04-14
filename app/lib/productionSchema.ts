// Production-Grade Database Schema with Context Objects
// Updated for robust data storage and future features

import { Timestamp } from 'firebase/firestore';

export interface ProductionQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  xp: number;
  concept?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  qualityScore?: number; // 0-100 from validation
  metadata?: {
    generatedAt: Timestamp;
    sourceModel?: string;
    processingTime?: number;
    retryCount?: number;
  };
}

export interface ContextObject {
  concepts: string[];
  summary: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: ProductionQuestion[];
  metadata: {
    sourceFileId: string;
    sourceFileName: string;
    trackId: string;
    subjectId: string;
    language: string;
    processedAt: Timestamp;
    processingVersion: string;
    qualityMetrics: {
      averageQuestionScore: number;
      validationPassed: boolean;
      warnings: string[];
      errors: string[];
    };
    performanceMetrics: {
      totalProcessingTime: number;
      aiCallCount: number;
      cacheHitRate: number;
      retryAttempts: number;
    };
  };
}

export interface ProductionQuestionBank {
  id: string;
  trackId: 'sm' | 'svt' | 'pc' | 'lettres' | 'common';
  subjectId: string;
  fileId: string; // CRITICAL: Prevents duplicates
  fileName: string;
  source: 'drive' | 'manual' | 'ai';
  language: 'ar' | 'en' | 'fr' | 'es';
  context: ContextObject;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  status: 'processing' | 'completed' | 'failed' | 'archived';
  tags: string[];
  accessCount: number;
  lastAccessed: Timestamp;
}

export interface LessonAnalysis {
  id: string;
  fileId: string;
  fileName: string;
  trackId: string;
  subjectId: string;
  rawText: string;
  sanitizedText: string;
  concepts: string[];
  summary: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  formulas: string[];
  keywords: string[];
  estimatedReadTime: number; // minutes
  processingMetrics: {
    sanitizationTime: number;
    analysisTime: number;
    qualityScore: number;
    warnings: string[];
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProcessingLog {
  id: string;
  operation: string;
  fileId?: string;
  trackId?: string;
  subjectId?: string;
  status: 'started' | 'completed' | 'failed' | 'retry';
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  error?: string;
  retryCount?: number;
  metadata: {
    operationType: 'sanitization' | 'analysis' | 'generation' | 'validation' | 'storage';
    modelUsed?: string;
    tokensUsed?: number;
    cacheHit?: boolean;
    qualityScore?: number;
  };
}

/**
 * Production database service with enhanced schema
 */
export class ProductionDatabaseService {
  private static readonly COLLECTIONS = {
    QUESTION_BANKS: 'productionQuestionBanks',
    LESSON_ANALYSES: 'lessonAnalyses',
    PROCESSING_LOGS: 'processingLogs',
    QUALITY_METRICS: 'qualityMetrics'
  } as const;

  /**
   * Save complete context object with validation
   */
  static async saveContextObject(
    contextObject: Omit<ContextObject, 'metadata'> & { 
      metadata: Omit<ContextObject['metadata'], 'processedAt'> 
    },
    trackId: string,
    subjectId: string
  ): Promise<string> {
    const db = await import('./firebase').then(m => m.db);
    const { doc, setDoc, Timestamp, collection } = await import('firebase/firestore');

    const docRef = doc(collection(db, this.COLLECTIONS.QUESTION_BANKS));
    const id = docRef.id;

    const fullContext: ContextObject = {
      ...contextObject,
      metadata: {
        ...contextObject.metadata,
        processedAt: Timestamp.now(),
        processingVersion: '1.0.0'
      }
    };

    const questionBank: ProductionQuestionBank = {
      id,
      trackId: trackId as any,
      subjectId,
      fileId: contextObject.metadata.sourceFileId,
      fileName: contextObject.metadata.sourceFileName,
      source: 'ai',
      language: contextObject.metadata.language as any,
      context: fullContext,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: 1,
      status: 'completed',
      tags: contextObject.concepts,
      accessCount: 0,
      lastAccessed: Timestamp.now()
    };

    await setDoc(docRef, questionBank);
    return id;
  }

  /**
   * Get context object with performance tracking
   */
  static async getContextObject(
    trackId: string,
    subjectId: string,
    fileId: string
  ): Promise<ProductionQuestionBank | null> {
    const db = await import('./firebase').then(m => m.db);
    const { collection, query, where, limit, getDocs, doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');

    // Try to find existing context object
    const q = query(
      collection(db, this.COLLECTIONS.QUESTION_BANKS),
      where('trackId', '==', trackId),
      where('subjectId', '==', subjectId),
      where('fileId', '==', fileId),
      where('status', '==', 'completed'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const docSnapshot = querySnapshot.docs[0];
    const data = docSnapshot.data() as ProductionQuestionBank;

    // Update access count and last accessed
    await updateDoc(docSnapshot.ref, {
      accessCount: data.accessCount + 1,
      lastAccessed: Timestamp.now()
    });

    return { ...data, id: docSnapshot.id };
  }

  /**
   * Save lesson analysis with sanitization metrics
   */
  static async saveLessonAnalysis(
    analysis: Omit<LessonAnalysis, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const db = await import('./firebase').then(m => m.db);
    const { doc, setDoc, Timestamp, collection } = await import('firebase/firestore');

    const docRef = doc(collection(db, this.COLLECTIONS.LESSON_ANALYSES));
    const id = docRef.id;

    const fullAnalysis: LessonAnalysis = {
      ...analysis,
      id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(docRef, fullAnalysis);
    return id;
  }

  /**
   * Log processing operation for monitoring
   */
  static async logProcessing(
    operation: string,
    status: ProcessingLog['status'],
    metadata: Partial<ProcessingLog['metadata']> & { operationType: ProcessingLog['metadata']['operationType'] },
    additionalData?: Partial<Pick<ProcessingLog, 'fileId' | 'trackId' | 'subjectId' | 'error' | 'retryCount'>>
  ): Promise<string> {
    const db = await import('./firebase').then(m => m.db);
    const { doc, setDoc, Timestamp, collection } = await import('firebase/firestore');

    const docRef = doc(collection(db, this.COLLECTIONS.PROCESSING_LOGS));
    const id = docRef.id;

    const log: ProcessingLog = {
      id,
      operation,
      status,
      startTime: Timestamp.now(),
      endTime: status === 'completed' || status === 'failed' ? Timestamp.now() : undefined,
      duration: status === 'completed' || status === 'failed' ? 0 : undefined,
      metadata,
      ...additionalData
    };

    await setDoc(docRef, log);
    return id;
  }

  /**
   * Get questions with quality filtering
   */
  static async getQuestionsWithQuality(
    trackId: string,
    subjectId: string,
    language: string,
    minQualityScore: number = 70,
    count: number = 10
  ): Promise<ProductionQuestion[]> {
    const db = await import('./firebase').then(m => m.db);
    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

    const q = query(
      collection(db, this.COLLECTIONS.QUESTION_BANKS),
      where('trackId', '==', trackId),
      where('subjectId', '==', subjectId),
      where('language', '==', language),
      where('status', '==', 'completed'),
      orderBy('context.metadata.qualityMetrics.averageQuestionScore', 'desc'),
      limit(count)
    );

    const querySnapshot = await getDocs(q);
    const allQuestions: ProductionQuestion[] = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data() as ProductionQuestionBank;
      
      // Filter questions by quality score
      const qualityQuestions = data.context.questions.filter(q => 
        !q.qualityScore || q.qualityScore >= minQualityScore
      );
      
      allQuestions.push(...qualityQuestions);
    }

    // Shuffle and limit results
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get processing statistics
   */
  static async getProcessingStats(timeRange: number = 24 * 60 * 60 * 1000): Promise<{
    totalProcessed: number;
    successRate: number;
    averageQuality: number;
    averageProcessingTime: number;
    errorBreakdown: Record<string, number>;
  }> {
    const db = await import('./firebase').then(m => m.db);
    const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');

    const cutoffTime = new Date(Date.now() - timeRange);
    const cutoffTimestamp = Timestamp.fromDate(cutoffTime);

    const q = query(
      collection(db, this.COLLECTIONS.PROCESSING_LOGS),
      where('startTime', '>=', cutoffTimestamp)
    );

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => doc.data() as ProcessingLog);

    const totalProcessed = logs.length;
    const completedLogs = logs.filter(log => log.status === 'completed');
    const successRate = totalProcessed > 0 ? (completedLogs.length / totalProcessed) * 100 : 0;

    // Calculate average quality from completed operations
    const qualityScores = completedLogs
      .filter(log => log.metadata.qualityScore)
      .map(log => log.metadata.qualityScore!);
    const averageQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;

    // Calculate average processing time
    const processingTimes = completedLogs
      .filter(log => log.duration !== undefined)
      .map(log => log.duration!);
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    for (const log of logs) {
      if (log.status === 'failed' && log.error) {
        const errorType = log.error.split(':')[0] || 'Unknown';
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
      }
    }

    return {
      totalProcessed,
      successRate,
      averageQuality,
      averageProcessingTime,
      errorBreakdown
    };
  }

  /**
   * Update question bank status
   */
  static async updateStatus(
    id: string,
    status: ProductionQuestionBank['status'],
    error?: string
  ): Promise<void> {
    const db = await import('./firebase').then(m => m.db);
    const { doc, updateDoc } = await import('firebase/firestore');

    const updateData: Partial<ProductionQuestionBank> = {
      status,
      updatedAt: Timestamp.now()
    };

    if (error) {
      // Store error in processing logs instead of main document
      await this.logProcessing(
        'status_update',
        'failed',
        { operationType: 'validation' },
        { error }
      );
    }

    await updateDoc(doc(db, this.COLLECTIONS.QUESTION_BANKS, id), updateData);
  }

  /**
   * Archive old question banks
   */
  static async archiveOldBanks(daysOld: number = 90): Promise<number> {
    const db = await import('./firebase').then(m => m.db);
    const { collection, query, where, getDocs, doc, updateDoc, Timestamp } = await import('firebase/firestore');

    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const q = query(
      collection(db, this.COLLECTIONS.QUESTION_BANKS),
      where('createdAt', '<', cutoffTimestamp),
      where('status', '==', 'completed')
    );

    const querySnapshot = await getDocs(q);
    let archivedCount = 0;

    for (const doc of querySnapshot.docs) {
      await updateDoc(doc.ref, {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
      archivedCount++;
    }

    return archivedCount;
  }
}

/**
 * Schema validation helpers
 */
export class SchemaValidator {
  /**
   * Validate context object structure
   */
  static validateContextObject(obj: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!obj || typeof obj !== 'object') {
      errors.push('Context object must be an object');
      return { isValid: false, errors };
    }

    // Required fields
    const requiredFields = ['concepts', 'summary', 'difficulty', 'questions'];
    for (const field of requiredFields) {
      if (!(field in obj)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate concepts
    if (obj.concepts && !Array.isArray(obj.concepts)) {
      errors.push('Concepts must be an array');
    }

    // Validate summary
    if (obj.summary && typeof obj.summary !== 'string') {
      errors.push('Summary must be a string');
    }

    // Validate difficulty
    if (obj.difficulty && !['Easy', 'Medium', 'Hard'].includes(obj.difficulty)) {
      errors.push('Difficulty must be Easy, Medium, or Hard');
    }

    // Validate questions
    if (obj.questions && !Array.isArray(obj.questions)) {
      errors.push('Questions must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate production question structure
   */
  static validateProductionQuestion(obj: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!obj || typeof obj !== 'object') {
      errors.push('Question must be an object');
      return { isValid: false, errors };
    }

    const requiredFields = ['question', 'choices', 'answer', 'explanation', 'xp'];
    for (const field of requiredFields) {
      if (!(field in obj)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ProductionDatabaseService;
