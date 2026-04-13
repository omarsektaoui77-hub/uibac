// AI Data Adapter - Abstracts AI-generated data
* Provides safe, validated access to AI-generated content

import { z } from 'zod';
import { logger } from '../logging/logger';

// AI response schemas
const AISubjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(100),
  description: z.string().max(500).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  icon: z.string().max(10).optional(),
  estimatedTime: z.number().min(1).max(120).optional(),
  prerequisites: z.array(z.string()).optional(),
});

const AIQuizSchema = z.object({
  id: z.string().optional(),
  subjectId: z.string(),
  title: z.string().max(200),
  questions: z.array(z.object({
    question: z.string().max(1000),
    options: z.array(z.string().max(500)).length(4),
    correctAnswer: z.number().min(0).max(3),
    explanation: z.string().max(1000).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  })).min(1).max(50),
  timeLimit: z.number().min(30).max(3600).optional(),
  passingScore: z.number().min(0).max(100).optional(),
});

// Types
export type AISubject = z.infer<typeof AISubjectSchema>;
export type AIQuiz = z.infer<typeof AIQuizSchema>;

/**
 * AI Data Adapter - Safe wrapper for AI-generated content
 */
export class AIDataAdapter {
  private static instance: AIDataAdapter;

  static getInstance(): AIDataAdapter {
    if (!AIDataAdapter.instance) {
      AIDataAdapter.instance = new AIDataAdapter();
    }
    return AIDataAdapter.instance;
  }

  /**
   * Validate AI-generated subject data
   */
  validateSubject(data: unknown): AISubject | null {
    try {
      const result = AISubjectSchema.safeParse(data);
      
      if (result.success) {
        logger.info('AI subject data validated', { subjectName: result.data.name });
        return result.data;
      } else {
        logger.warn('AI subject data validation failed', { 
          error: result.error.message,
          data 
        });
        return null;
      }
    } catch (error) {
      logger.error('Failed to validate AI subject data', error as Error);
      return null;
    }
  }

  /**
   * Validate AI-generated quiz data
   */
  validateQuiz(data: unknown): AIQuiz | null {
    try {
      const result = AIQuizSchema.safeParse(data);
      
      if (result.success) {
        logger.info('AI quiz data validated', { 
          quizTitle: result.data.title,
          questionCount: result.data.questions.length 
        });
        return result.data;
      } else {
        logger.warn('AI quiz data validation failed', { 
          error: result.error.message,
          data 
        });
        return null;
      }
    } catch (error) {
      logger.error('Failed to validate AI quiz data', error as Error);
      return null;
    }
  }

  /**
   * Sanitize AI-generated text
   */
  sanitizeText(text: string, maxLength: number = 1000): string {
    return text
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JavaScript URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, maxLength);
  }

  /**
   * Generate safe ID for AI content
   */
  generateId(prefix: string, content: string): string {
    const hash = this.simpleHash(content);
    return `${prefix}_${hash}`;
  }

  /**
   * Simple hash function for ID generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Merge AI data with existing data safely
   */
  mergeWithExisting<T extends Record<string, any>>(
    aiData: Partial<T>,
    existingData: T,
    requiredFields: (keyof T)[]
  ): T | null {
    // Check if all required fields are present
    const hasAllRequired = requiredFields.every(field => 
      field in aiData && aiData[field] !== undefined
    );

    if (!hasAllRequired) {
      logger.warn('AI data missing required fields', { 
        requiredFields,
        providedFields: Object.keys(aiData)
      });
      return null;
    }

    // Merge with existing data
    const merged = { ...existingData, ...aiData };
    
    logger.info('AI data merged with existing data', { 
      mergedFields: Object.keys(aiData)
    });

    return merged;
  }

  /**
   * Create fallback data when AI fails
   */
  createFallbackSubject(name: string): AISubject {
    return {
      name: this.sanitizeText(name),
      description: 'Generated content unavailable',
      difficulty: 'medium',
      icon: '?',
      estimatedTime: 30,
      prerequisites: [],
    };
  }

  /**
   * Create fallback quiz when AI fails
   */
  createFallbackQuiz(subjectId: string): AIQuiz {
    return {
      subjectId,
      title: 'Practice Quiz',
      questions: [
        {
          question: 'This is a placeholder question. AI-generated content is currently unavailable.',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'Please try again later for AI-generated questions.',
          difficulty: 'medium'
        }
      ],
      timeLimit: 600,
      passingScore: 70,
    };
  }

  /**
   * Batch validate AI responses
   */
  validateBatch<T>(
    items: unknown[],
    validator: (item: unknown) => T | null
  ): { valid: T[]; invalid: number } {
    const valid: T[] = [];
    let invalid = 0;

    for (const item of items) {
      const validated = validator(item);
      if (validated) {
        valid.push(validated);
      } else {
        invalid++;
      }
    }

    logger.info('Batch validation completed', { 
      total: items.length,
      valid: valid.length,
      invalid
    });

    return { valid, invalid };
  }

  /**
   * Check if AI data is recent (not stale)
   */
  isDataRecent(timestamp: Date | string, maxAgeHours: number = 24): boolean {
    const dataTime = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const ageInHours = (now.getTime() - dataTime.getTime()) / (1000 * 60 * 60);
    
    return ageInHours <= maxAgeHours;
  }

  /**
   * Get AI readiness metrics
   */
  getMetrics() {
    return {
      sessionId: logger.getSessionInfo().sessionId,
      adapterVersion: '1.0.0',
      supportedSchemas: ['AISubject', 'AIQuiz'],
      validationEnabled: true,
      sanitizationEnabled: true,
    };
  }
}

// Export singleton instance
export const aiDataAdapter = AIDataAdapter.getInstance();

// Export convenience functions
export const validateAISubject = (data: unknown) => aiDataAdapter.validateSubject(data);
export const validateAIQuiz = (data: unknown) => aiDataAdapter.validateQuiz(data);
export const sanitizeAIText = (text: string, maxLength?: number) => aiDataAdapter.sanitizeText(text, maxLength);
export const generateAIId = (prefix: string, content: string) => aiDataAdapter.generateId(prefix, content);
