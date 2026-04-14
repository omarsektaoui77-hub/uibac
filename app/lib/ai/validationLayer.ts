// AI Response Validation and Safety Layer
// Ensures AI responses are safe, appropriate, and properly formatted

import { AIRecommendation } from './decisionEngine';
import { AIContext } from './contextEngine';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedRecommendation?: AIRecommendation;
  safetyScore: number; // 0-100
  confidenceScore: number; // 0-100
}

export interface SafetyRule {
  name: string;
  validate: (recommendation: AIRecommendation, context: AIContext) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface ContentFilter {
  checkInappropriate: (text: string) => boolean;
  checkHarmful: (text: string) => boolean;
  checkPersonalInfo: (text: string) => boolean;
}

/**
 * AI Response Validation and Safety Layer
 * Comprehensive validation and sanitization of AI responses
 */
export class AIValidationLayer {
  
  private static safetyRules: SafetyRule[] = [
    {
      name: 'study_duration_safety',
      validate: (rec, ctx) => rec.estimated_duration >= 5 && rec.estimated_duration <= 120,
      severity: 'high',
      message: 'Study duration must be between 5 and 120 minutes'
    },
    {
      name: 'xp_safety',
      validate: (rec, ctx) => rec.expected_xp >= 5 && rec.expected_xp <= 100,
      severity: 'medium',
      message: 'Expected XP must be between 5 and 100'
    },
    {
      name: 'subject_validity',
      validate: (rec, ctx) => {
        const validSubjects = Object.keys(ctx.subjects);
        return validSubjects.includes(rec.focus_subject) || rec.focus_subject === 'general';
      },
      severity: 'high',
      message: 'Focus subject must be one of the user\'s active subjects'
    },
    {
      name: 'burnout_protection',
      validate: (rec, ctx) => {
        if (ctx.behavior.burnoutRisk === 'high') {
          return rec.difficulty !== 'hard' && rec.estimated_duration <= 30;
        }
        return true;
      },
      severity: 'medium',
      message: 'High burnout risk: recommend shorter, easier sessions'
    },
    {
      name: 'consistency_check',
      validate: (rec, ctx) => {
        if (ctx.behavior.consistencyScore < 30) {
          return rec.difficulty !== 'hard' && rec.study_plan.toLowerCase().includes('consistency');
        }
        return true;
      },
      severity: 'low',
      message: 'Low consistency: recommend building study habits'
    },
    {
      name: 'confidence_threshold',
      validate: (rec, ctx) => rec.confidence >= 0.3 && rec.confidence <= 1.0,
      severity: 'medium',
      message: 'Confidence must be between 0.3 and 1.0'
    },
    {
      name: 'motivation_safety',
      validate: (rec, ctx) => {
        const forbiddenWords = ['impossible', 'failure', 'quit', 'give up', 'stupid'];
        const motivationText = rec.motivation.toLowerCase();
        return !forbiddenWords.some(word => motivationText.includes(word));
      },
      severity: 'high',
      message: 'Motivation must not contain negative or discouraging language'
    },
    {
      name: 'study_plan_safety',
      validate: (rec, ctx) => {
        const planLength = rec.study_plan.length;
        return planLength >= 10 && planLength <= 500;
      },
      severity: 'medium',
      message: 'Study plan must be between 10 and 500 characters'
    },
    {
      name: 'difficulty_appropriateness',
      validate: (rec, ctx) => {
        const subjectData = ctx.subjects[rec.focus_subject];
        if (!subjectData) return true;
        
        // Don't recommend hard difficulty for beginners
        if (subjectData.level < 3 && rec.difficulty === 'hard') {
          return false;
        }
        
        // Don't recommend easy difficulty for advanced students
        if (subjectData.level > 10 && rec.difficulty === 'easy') {
          return false;
        }
        
        return true;
      },
      severity: 'medium',
      message: 'Difficulty must match student\'s current level'
    }
  ];

  /**
   * Validate AI recommendation comprehensively
   */
  static async validateRecommendation(
    recommendation: AIRecommendation,
    context: AIContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let safetyScore = 100;
    let confidenceScore = recommendation.confidence * 100;

    try {
      // Basic structure validation
      const structureValidation = this.validateStructure(recommendation);
      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors);
      }

      // Safety rule validation
      for (const rule of this.safetyRules) {
        if (!rule.validate(recommendation, context)) {
          if (rule.severity === 'critical' || rule.severity === 'high') {
            errors.push(rule.message);
            safetyScore -= this.getSafetyPenalty(rule.severity);
          } else {
            warnings.push(rule.message);
            safetyScore -= this.getSafetyPenalty(rule.severity) / 2;
          }
        }
      }

      // Content safety validation
      const contentValidation = await this.validateContent(recommendation);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
        safetyScore -= 20;
      }

      // Context appropriateness validation
      const contextValidation = this.validateContextAppropriateness(recommendation, context);
      if (!contextValidation.isValid) {
        warnings.push(...contextValidation.warnings);
        confidenceScore -= 10;
      }

      // Sanitize recommendation if needed
      let sanitizedRecommendation: AIRecommendation | undefined;
      if (errors.length === 0 && warnings.length > 0) {
        sanitizedRecommendation = this.sanitizeRecommendation(recommendation, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedRecommendation,
        safetyScore: Math.max(0, safetyScore),
        confidenceScore: Math.max(0, confidenceScore)
      };

    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Validation system error'],
        warnings: [],
        safetyScore: 0,
        confidenceScore: 0
      };
    }
  }

  /**
   * Validate basic structure of recommendation
   */
  private static validateStructure(recommendation: AIRecommendation): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const requiredFields = [
      'focus_subject', 'reason', 'study_plan', 'motivation',
      'difficulty', 'confidence', 'estimated_duration', 'expected_xp'
    ];

    for (const field of requiredFields) {
      if (!(field in recommendation)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validation
    if (typeof recommendation.confidence !== 'number') {
      errors.push('Confidence must be a number');
    }

    if (typeof recommendation.estimated_duration !== 'number') {
      errors.push('Estimated duration must be a number');
    }

    if (typeof recommendation.expected_xp !== 'number') {
      errors.push('Expected XP must be a number');
    }

    if (!['easy', 'medium', 'hard'].includes(recommendation.difficulty)) {
      errors.push('Difficulty must be easy, medium, or hard');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate content for safety
   */
  private static async validateContent(recommendation: AIRecommendation): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const textToCheck = `${recommendation.study_plan} ${recommendation.motivation} ${recommendation.reason}`;

    // Check for inappropriate content
    if (this.containsInappropriateContent(textToCheck)) {
      errors.push('Content contains inappropriate language');
    }

    // Check for harmful content
    if (this.containsHarmfulContent(textToCheck)) {
      errors.push('Content contains potentially harmful suggestions');
    }

    // Check for personal information requests
    if (this.requestsPersonalInformation(textToCheck)) {
      errors.push('Content requests personal information');
    }

    // Check for medical/psychological advice
    if (this.containsMedicalAdvice(textToCheck)) {
      errors.push('Content should not provide medical or psychological advice');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate context appropriateness
   */
  private static validateContextAppropriateness(
    recommendation: AIRecommendation,
    context: AIContext
  ): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check if recommendation considers recent performance
    if (context.recentActivity.length > 0) {
      const recentSubject = context.recentActivity[0]?.subject;
      if (recentSubject && recommendation.focus_subject !== recentSubject) {
        const recentAccuracy = context.recentActivity[0]?.successRate;
        if (recentAccuracy < 50) {
          warnings.push('Consider recommending review of recent struggling subject');
        }
      }
    }

    // Check if recommendation considers streak status
    if (context.stats.streak === 0 && !recommendation.motivation.toLowerCase().includes('start')) {
      warnings.push('Consider motivational message for streak restart');
    }

    // Check if recommendation considers burnout risk
    if (context.behavior.burnoutRisk === 'high' && recommendation.difficulty === 'hard') {
      warnings.push('High burnout risk detected - consider easier difficulty');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Sanitize recommendation based on warnings
   */
  private static sanitizeRecommendation(
    recommendation: AIRecommendation,
    warnings: string[]
  ): AIRecommendation {
    const sanitized = { ...recommendation };

    // Adjust study duration if too long for high burnout risk
    if (warnings.some(w => w.includes('burnout')) && sanitized.estimated_duration > 30) {
      sanitized.estimated_duration = 25;
      sanitized.study_plan += ' (Reduced duration for well-being)';
    }

    // Adjust difficulty if too hard for low consistency
    if (warnings.some(w => w.includes('consistency')) && sanitized.difficulty === 'hard') {
      sanitized.difficulty = 'medium';
      sanitized.study_plan += ' (Adjusted difficulty for better consistency)';
    }

    // Add safety note to motivation if needed
    if (warnings.some(w => w.includes('safety'))) {
      sanitized.motivation += ' Take breaks and stay healthy!';
    }

    return sanitized;
  }

  /**
   * Get safety penalty based on severity
   */
  private static getSafetyPenalty(severity: string): number {
    switch (severity) {
      case 'critical': return 50;
      case 'high': return 30;
      case 'medium': return 15;
      case 'low': return 5;
      default: return 10;
    }
  }

  /**
   * Check for inappropriate content
   */
  private static containsInappropriateContent(text: string): boolean {
    const inappropriateWords = [
      'damn', 'hell', 'stupid', 'idiot', 'dumb', 'loser',
      'hate', 'kill', 'die', 'suicide'
    ];

    const lowerText = text.toLowerCase();
    return inappropriateWords.some(word => lowerText.includes(word));
  }

  /**
   * Check for harmful content
   */
  private static containsHarmfulContent(text: string): boolean {
    const harmfulPatterns = [
      /skip.*sleep/i,
      /pull.*all.*nighter/i,
      /study.*until.*collapse/i,
      /ignore.*health/i
    ];

    return harmfulPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check for personal information requests
   */
  private static requestsPersonalInformation(text: string): boolean {
    const personalInfoPatterns = [
      /email/i,
      /phone/i,
      /address/i,
      /password/i,
      /social.*security/i
    ];

    return personalInfoPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check for medical/psychological advice
   */
  private static containsMedicalAdvice(text: string): boolean {
    const medicalPatterns = [
      /diagnos/i,
      /therap/i,
      /medication/i,
      /depression/i,
      /anxiety.*disorder/i,
      /psycholog/i
    ];

    return medicalPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Quick validation for emergency fallback
   */
  static quickValidate(recommendation: AIRecommendation): boolean {
    try {
      return !!(
        recommendation.focus_subject &&
        recommendation.reason &&
        recommendation.study_plan &&
        recommendation.motivation &&
        ['easy', 'medium', 'hard'].includes(recommendation.difficulty) &&
        recommendation.confidence >= 0 &&
        recommendation.confidence <= 1 &&
        recommendation.estimated_duration > 0 &&
        recommendation.expected_xp > 0
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get safety report for monitoring
   */
  static getSafetyReport(validationResult: ValidationResult): {
    level: 'safe' | 'caution' | 'unsafe';
    summary: string;
    recommendations: string[];
  } {
    const { safetyScore, errors, warnings } = validationResult;

    let level: 'safe' | 'caution' | 'unsafe';
    let summary: string;
    const recommendations: string[] = [];

    if (safetyScore >= 80) {
      level = 'safe';
      summary = 'Recommendation passed all safety checks';
    } else if (safetyScore >= 60) {
      level = 'caution';
      summary = 'Recommendation has minor safety concerns';
      recommendations.push('Review warnings before proceeding');
    } else {
      level = 'unsafe';
      summary = 'Recommendation has significant safety issues';
      recommendations.push('Do not use this recommendation');
      recommendations.push('Generate new recommendation');
    }

    if (errors.length > 0) {
      recommendations.push('Address critical errors immediately');
    }

    if (warnings.length > 0) {
      recommendations.push('Consider warnings for improvement');
    }

    return {
      level,
      summary,
      recommendations
    };
  }
}

export default AIValidationLayer;
