// AI Trust Boundaries
// Enforces strict separation between trusted backend and untrusted AI

export interface AIContract {
  recommendation: {
    focus_subject: string;
    reason: string;
    study_plan: string;
    motivation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    confidence: number;
    estimated_duration: number;
    expected_xp: number;
    learning_objectives: string[];
    risk_factors: string[];
  };
  metadata: {
    model: string;
    confidence: number;
    responseTime: number;
    cached: boolean;
    safetyScore: number;
  };
}

export interface TrustValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedContract?: AIContract;
}

export interface BackendTruth {
  userProgress: {
    xp: number;
    level: number;
    streak: number;
    subjects: Record<string, any>;
  };
  sessionData: {
    isActive: boolean;
    lastActivity: Date;
    currentSubject?: string;
  };
  performance: {
    accuracy: number;
    timeSpent: number;
    questionsAnswered: number;
  };
}

/**
 * AI Trust Boundaries Manager
 * Ensures AI cannot override core system logic
 */
export class AITrustBoundaries {
  
  /**
   * Validate AI contract against trust boundaries
   */
  static validateAIContract(contract: AIContract): TrustValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate recommendation structure
    if (!contract.recommendation) {
      errors.push('Missing recommendation data');
    }

    // Validate required fields
    const required = ['focus_subject', 'reason', 'study_plan', 'motivation'];
    for (const field of required) {
      if (!contract.recommendation[field as keyof typeof contract.recommendation]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate data types
    if (contract.recommendation.confidence !== undefined && 
        (typeof contract.recommendation.confidence !== 'number' || 
         contract.recommendation.confidence < 0 || 
         contract.recommendation.confidence > 1)) {
      errors.push('Invalid confidence value');
    }

    if (contract.recommendation.estimated_duration !== undefined && 
        (typeof contract.recommendation.estimated_duration !== 'number' || 
         contract.recommendation.estimated_duration < 5 || 
         contract.recommendation.estimated_duration > 120)) {
      errors.push('Invalid estimated duration');
    }

    // Validate difficulty
    if (contract.recommendation.difficulty && 
        !['easy', 'medium', 'hard'].includes(contract.recommendation.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    // Validate subject (must be from user's subjects)
    // This would check against user's actual subjects
    // For now, just validate it's a string
    if (contract.recommendation.focus_subject && 
        typeof contract.recommendation.focus_subject !== 'string') {
      errors.push('Invalid focus subject');
    }

    // Check for potential security issues
    const textFields = [
      contract.recommendation.reason,
      contract.recommendation.study_plan,
      contract.recommendation.motivation
    ];

    for (const text of textFields) {
      if (text && typeof text === 'string') {
        // Check for script injection attempts
        if (text.includes('<script>') || text.includes('javascript:')) {
          errors.push('Potential security issue in recommendation text');
        }

        // Check for excessive length
        if (text.length > 1000) {
          warnings.push('Recommendation text is very long');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContract: errors.length === 0 ? contract : undefined
    };
  }

  /**
   * Enforce AI cannot modify core system state
   */
  static enforceSystemBoundaries(aiOutput: any, systemState: BackendTruth): {
    allowed: boolean;
    reason: string;
    sanitizedOutput?: any;
  } {
    // AI can only provide recommendations, not modify system state
    const forbiddenOperations = [
      'modifyXP',
      'changeLevel',
      'updateStreak',
      'lockUser',
      'bypassAuth',
      'accessAdmin',
      'modifySettings'
    ];

    for (const operation of forbiddenOperations) {
      if (aiOutput[operation]) {
        return {
          allowed: false,
          reason: `AI attempted forbidden operation: ${operation}`
        };
      }
    }

    // AI cannot provide database operations
    const forbiddenDBOps = [
      'deleteUser',
      'createUser',
      'updateDatabase',
      'accessRawData',
      'bypassValidation'
    ];

    for (const op of forbiddenDBOps) {
      if (JSON.stringify(aiOutput).includes(op)) {
        return {
          allowed: false,
          reason: `AI attempted database operation: ${op}`
        };
      }
    }

    // Validate AI output doesn't try to override backend truth
    if (aiOutput.userProgress && systemState.userProgress) {
      // AI can suggest changes but not override actual values
      const sanitized = { ...aiOutput };
      delete sanitized.userProgress;
      
      return {
        allowed: true,
        reason: 'AI output sanitized (removed userProgress override)',
        sanitizedOutput: sanitized
      };
    }

    return {
      allowed: true,
      reason: 'AI output within trust boundaries'
    };
  }

  /**
   * Create safe AI response wrapper
   */
  static createSafeResponse(aiRecommendation: AIContract): {
    success: boolean;
    data: AIContract;
    trust: {
      validated: boolean;
      source: 'ai';
      boundaries: 'enforced';
    };
    warnings: string[];
  } {
    const validation = this.validateAIContract(aiRecommendation);
    
    return {
      success: validation.isValid,
      data: validation.sanitizedContract || aiRecommendation,
      trust: {
        validated: validation.isValid,
        source: 'ai',
        boundaries: 'enforced'
      },
      warnings: validation.warnings
    };
  }

  /**
   * Get backend truth (trusted data)
   */
  static async getBackendTruth(userId: string): Promise<BackendTruth> {
    // This would fetch actual user data from trusted backend sources
    // Mock implementation for now
    return {
      userProgress: {
        xp: 1250,
        level: 5,
        streak: 3,
        subjects: {
          mathematics: { level: 4, accuracy: 75 },
          physics: { level: 6, accuracy: 88 },
          philosophy: { level: 3, accuracy: 92 }
        }
      },
      sessionData: {
        isActive: true,
        lastActivity: new Date(),
        currentSubject: 'mathematics'
      },
      performance: {
        accuracy: 82,
        timeSpent: 45,
        questionsAnswered: 23
      }
    };
  }

  /**
   * Compare AI recommendation with backend truth
   */
  static compareWithTruth(
    aiRecommendation: AIContract,
    backendTruth: BackendTruth
  ): {
    alignment: number; // 0-100
    conflicts: string[];
    suggestions: string[];
  } {
    const conflicts: string[] = [];
    const suggestions: string[] = [];
    let alignmentScore = 100;

    // Check subject alignment
    if (aiRecommendation.recommendation.focus_subject) {
      const subjectData = backendTruth.userProgress.subjects[aiRecommendation.recommendation.focus_subject];
      if (!subjectData) {
        conflicts.push(`AI recommends unknown subject: ${aiRecommendation.recommendation.focus_subject}`);
        alignmentScore -= 20;
      } else {
        // Check difficulty alignment with subject level
        const subjectLevel = subjectData.level;
        const aiDifficulty = aiRecommendation.recommendation.difficulty;
        
        if (subjectLevel < 3 && aiDifficulty === 'hard') {
          conflicts.push('AI suggests hard difficulty for beginner subject');
          alignmentScore -= 15;
        } else if (subjectLevel > 8 && aiDifficulty === 'easy') {
          conflicts.push('AI suggests easy difficulty for advanced subject');
          alignmentScore -= 10;
        } else {
          suggestions.push('Difficulty level matches subject proficiency');
        }
      }
    }

    // Check duration alignment with user patterns
    if (aiRecommendation.recommendation.estimated_duration) {
      const avgTime = backendTruth.performance.timeSpent;
      const aiDuration = aiRecommendation.recommendation.estimated_duration;
      
      if (Math.abs(aiDuration - avgTime) > avgTime * 0.5) {
        conflicts.push(`AI duration (${aiDuration}min) deviates significantly from user average (${avgTime}min)`);
        alignmentScore -= 10;
      } else {
        suggestions.push('Study duration aligns with user patterns');
      }
    }

    // Check confidence alignment with accuracy
    if (aiRecommendation.recommendation.confidence && backendTruth.performance.accuracy) {
      const aiConfidence = aiRecommendation.recommendation.confidence;
      const userAccuracy = backendTruth.performance.accuracy;
      
      if (aiConfidence > 0.9 && userAccuracy < 60) {
        conflicts.push('AI shows high confidence despite low user accuracy');
        alignmentScore -= 15;
      } else if (aiConfidence < 0.5 && userAccuracy > 90) {
        suggestions.push('AI confidence could be higher given user performance');
      }
    }

    return {
      alignment: Math.max(0, alignmentScore),
      conflicts,
      suggestions
    };
  }

  /**
   * Apply AI recommendations safely
   */
  static async applyRecommendationSafely(
    userId: string,
    aiRecommendation: AIContract
  ): Promise<{
    success: boolean;
    applied: boolean;
    reason: string;
    warnings: string[];
  }> {
    try {
      // Validate AI contract
      const validation = this.validateAIContract(aiRecommendation);
      if (!validation.isValid) {
        return {
          success: false,
          applied: false,
          reason: `AI recommendation validation failed: ${validation.errors.join(', ')}`,
          warnings: validation.warnings
        };
      }

      // Get backend truth
      const backendTruth = await this.getBackendTruth(userId);
      
      // Check alignment
      const comparison = this.compareWithTruth(aiRecommendation, backendTruth);
      
      // Apply recommendation only if aligned enough
      if (comparison.alignment >= 70) {
        // Store recommendation for user to consider
        // This would save to a user-accessible recommendations table
        console.log(`AI recommendation applied for user ${userId}:`, aiRecommendation.recommendation.focus_subject);
        
        return {
          success: true,
          applied: true,
          reason: 'AI recommendation applied successfully',
          warnings: comparison.conflicts
        };
      } else {
        return {
          success: true,
          applied: false,
          reason: `AI recommendation not aligned with user data (alignment: ${comparison.alignment}%)`,
          warnings: [...comparison.conflicts, ...validation.warnings]
        };
      }

    } catch (error) {
      console.error('Safe recommendation application error:', error);
      return {
        success: false,
        applied: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        warnings: []
      };
    }
  }

  /**
   * Get trust boundary statistics
   */
  static getTrustStatistics(): {
    totalRecommendations: number;
    appliedRecommendations: number;
    rejectedRecommendations: number;
    averageAlignment: number;
    commonConflicts: string[];
  } {
    // Mock implementation - would track actual statistics
    return {
      totalRecommendations: 150,
      appliedRecommendations: 120,
      rejectedRecommendations: 30,
      averageAlignment: 78.5,
      commonConflicts: [
        'Difficulty level mismatch',
        'Subject not in user curriculum',
        'Duration deviation from user patterns'
      ]
    };
  }

  /**
   * Reset trust boundaries
   */
  static resetBoundaries(): void {
    console.log('AI Trust Boundaries reset');
    // This would clear any cached violations or warnings
  }

  /**
   * Get trust configuration
   */
  static getTrustConfiguration(): {
    enabled: boolean;
    strictMode: boolean;
    allowedAIOperations: string[];
    forbiddenAIOperations: string[];
    validationLevel: 'strict' | 'moderate' | 'lenient';
  } {
    return {
      enabled: true,
      strictMode: true,
      allowedAIOperations: [
        'recommend',
        'suggest',
        'analyze',
        'motivate'
      ],
      forbiddenAIOperations: [
        'modify',
        'delete',
        'create',
        'override',
        'bypass'
      ],
      validationLevel: 'strict'
    };
  }
}

export default AITrustBoundaries;
