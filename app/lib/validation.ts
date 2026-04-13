// Production-Grade Validation & Quality Filtering System
// Ensures data integrity and logical consistency

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100 quality score
}

export interface QuestionValidation {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  xp: number;
  concept?: string;
  difficulty?: string;
}

export interface ContextObject {
  concepts: string[];
  summary: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: QuestionValidation[];
}

/**
 * Production-grade validation system
 */
export class ValidationSystem {
  private static readonly MIN_QUESTION_LENGTH = 15;
  private static readonly MAX_QUESTION_LENGTH = 500;
  private static readonly MIN_EXPLANATION_LENGTH = 10;
  private static readonly MAX_EXPLANATION_LENGTH = 300;
  private static readonly MIN_CHOICES = 2;
  private static readonly MAX_CHOICES = 6;
  private static readonly VALID_XP_RANGE = { min: 5, max: 50 };
  private static readonly VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

  /**
   * Validate single question comprehensively
   */
  static validateQuestion(question: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Type validation
    if (!question || typeof question !== 'object') {
      return {
        isValid: false,
        errors: ['Question must be an object'],
        warnings: [],
        score: 0
      };
    }

    // Required fields validation
    const requiredFields = ['question', 'choices', 'answer', 'explanation', 'xp'];
    for (const field of requiredFields) {
      if (!(field in question)) {
        errors.push(`Missing required field: ${field}`);
        score -= 20;
      }
    }

    // Question text validation
    if (question.question) {
      const questionValidation = this.validateQuestionText(question.question);
      errors.push(...questionValidation.errors);
      warnings.push(...questionValidation.warnings);
      score += questionValidation.score;
    }

    // Choices validation
    if (question.choices) {
      const choicesValidation = this.validateChoices(question.choices, question.answer);
      errors.push(...choicesValidation.errors);
      warnings.push(...choicesValidation.warnings);
      score += choicesValidation.score;
    }

    // Answer validation
    if (question.answer && question.choices) {
      const answerValidation = this.validateAnswer(question.answer, question.choices);
      errors.push(...answerValidation.errors);
      warnings.push(...answerValidation.warnings);
      score += answerValidation.score;
    }

    // Explanation validation
    if (question.explanation) {
      const explanationValidation = this.validateExplanation(question.explanation);
      errors.push(...explanationValidation.errors);
      warnings.push(...explanationValidation.warnings);
      score += explanationValidation.score;
    }

    // XP validation
    if (question.xp !== undefined) {
      const xpValidation = this.validateXP(question.xp);
      errors.push(...xpValidation.errors);
      warnings.push(...xpValidation.warnings);
      score += xpValidation.score;
    }

    // Optional fields validation
    if (question.concept) {
      const conceptValidation = this.validateConcept(question.concept);
      errors.push(...conceptValidation.errors);
      warnings.push(...conceptValidation.warnings);
      score += conceptValidation.score;
    }

    if (question.difficulty) {
      const difficultyValidation = this.validateDifficulty(question.difficulty);
      errors.push(...difficultyValidation.errors);
      warnings.push(...difficultyValidation.warnings);
      score += difficultyValidation.score;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, score))
    };
  }

  /**
   * Validate question text
   */
  private static validateQuestionText(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (typeof text !== 'string') {
      errors.push('Question must be a string');
      return { isValid: false, errors, warnings, score: 0 };
    }

    const trimmedText = text.trim();

    if (trimmedText.length < this.MIN_QUESTION_LENGTH) {
      errors.push(`Question too short (minimum ${this.MIN_QUESTION_LENGTH} characters)`);
      score -= 15;
    } else if (trimmedText.length > this.MAX_QUESTION_LENGTH) {
      warnings.push(`Question very long (${trimmedText.length} characters)`);
      score -= 5;
    } else {
      score += 10;
    }

    // Check for question mark or proper question format
    if (!trimmedText.includes('?') && !trimmedText.match(/^(What|How|Why|When|Where|Which|Calculate|Find|Determine)/i)) {
      warnings.push('Question may not be properly formatted');
      score -= 5;
    } else {
      score += 5;
    }

    // Check for Arabic content quality
    if (/[\u0600-\u06FF]/.test(trimmedText)) {
      if (trimmedText.length < 20) {
        warnings.push('Arabic question may be too short');
        score -= 3;
      } else {
        score += 3; // Bonus for proper Arabic content
      }
    }

    // Check for mathematical content
    if (/[+\-×÷=<>±²³¹]/.test(trimmedText)) {
      score += 2; // Bonus for math content
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(20, score))
    };
  }

  /**
   * Validate choices array
   */
  private static validateChoices(choices: any[], answer?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (!Array.isArray(choices)) {
      errors.push('Choices must be an array');
      return { isValid: false, errors, warnings, score: 0 };
    }

    if (choices.length < this.MIN_CHOICES) {
      errors.push(`Too few choices (minimum ${this.MIN_CHOICES})`);
      score -= 20;
    } else if (choices.length > this.MAX_CHOICES) {
      warnings.push(`Too many choices (${choices.length}, recommended ${this.MAX_CHOICES})`);
      score -= 5;
    } else if (choices.length === 4) {
      score += 10; // Perfect number of choices
    } else {
      score += 5;
    }

    // Validate each choice
    let validChoices = 0;
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      
      if (typeof choice !== 'string') {
        errors.push(`Choice ${i + 1} must be a string`);
        continue;
      }

      const trimmedChoice = choice.trim();
      
      if (trimmedChoice.length < 1) {
        errors.push(`Choice ${i + 1} is empty`);
        continue;
      }

      if (trimmedChoice.length > 100) {
        warnings.push(`Choice ${i + 1} is very long`);
        score -= 1;
      }

      // Check for duplicate choices
      const duplicates = choices.filter((c, idx) => 
        typeof c === 'string' && c.trim() === trimmedChoice && idx !== i
      );
      
      if (duplicates.length > 0) {
        errors.push(`Duplicate choice: "${trimmedChoice}"`);
        continue;
      }

      validChoices++;
    }

    if (validChoices === 0) {
      errors.push('No valid choices found');
      score -= 30;
    } else if (validChoices < this.MIN_CHOICES) {
      errors.push(`Not enough valid choices (${validChoices}/${this.MIN_CHOICES})`);
      score -= 15;
    } else {
      score += 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(30, score))
    };
  }

  /**
   * Validate answer matches choices
   */
  private static validateAnswer(answer: string, choices: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (typeof answer !== 'string') {
      errors.push('Answer must be a string');
      return { isValid: false, errors, warnings, score: 0 };
    }

    const trimmedAnswer = answer.trim();

    if (trimmedAnswer.length === 0) {
      errors.push('Answer cannot be empty');
      score -= 20;
      return { isValid: false, errors, warnings, score: 0 };
    }

    // Check if answer matches one of the choices
    const matchingChoices = choices.filter(choice => 
      typeof choice === 'string' && choice.trim() === trimmedAnswer
    );

    if (matchingChoices.length === 0) {
      errors.push(`Answer "${trimmedAnswer}" does not match any choice`);
      score -= 25;
    } else if (matchingChoices.length > 1) {
      warnings.push(`Answer "${trimmedAnswer}" matches multiple choices`);
      score -= 10;
    } else {
      score += 15; // Perfect match
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(25, score))
    };
  }

  /**
   * Validate explanation
   */
  private static validateExplanation(explanation: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (typeof explanation !== 'string') {
      errors.push('Explanation must be a string');
      return { isValid: false, errors, warnings, score: 0 };
    }

    const trimmedExplanation = explanation.trim();

    if (trimmedExplanation.length < this.MIN_EXPLANATION_LENGTH) {
      errors.push(`Explanation too short (minimum ${this.MIN_EXPLANATION_LENGTH} characters)`);
      score -= 10;
    } else if (trimmedExplanation.length > this.MAX_EXPLANATION_LENGTH) {
      warnings.push(`Explanation very long (${trimmedExplanation.length} characters)`);
      score -= 3;
    } else {
      score += 8;
    }

    // Check for educational value indicators
    const educationalKeywords = ['because', 'since', 'due to', 'therefore', 'thus', 'because', 'since'];
    const hasEducationalContent = educationalKeywords.some(keyword => 
      trimmedExplanation.toLowerCase().includes(keyword)
    );

    if (hasEducationalContent) {
      score += 4;
    } else {
      warnings.push('Explanation may lack educational value');
      score -= 2;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(15, score))
    };
  }

  /**
   * Validate XP value
   */
  private static validateXP(xp: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (typeof xp !== 'number' || !Number.isInteger(xp)) {
      errors.push('XP must be an integer');
      return { isValid: false, errors, warnings, score: 0 };
    }

    if (xp < this.VALID_XP_RANGE.min) {
      errors.push(`XP too low (minimum ${this.VALID_XP_RANGE.min})`);
      score -= 10;
    } else if (xp > this.VALID_XP_RANGE.max) {
      warnings.push(`XP very high (${xp}, recommended max ${this.VALID_XP_RANGE.max})`);
      score -= 5;
    } else if (xp >= 10 && xp <= 30) {
      score += 5; // Good XP range
    } else {
      score += 3;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(10, score))
    };
  }

  /**
   * Validate concept
   */
  private static validateConcept(concept: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (typeof concept !== 'string') {
      errors.push('Concept must be a string');
      return { isValid: false, errors, warnings, score: 0 };
    }

    const trimmedConcept = concept.trim();

    if (trimmedConcept.length === 0) {
      errors.push('Concept cannot be empty');
      score -= 5;
    } else if (trimmedConcept.length > 50) {
      warnings.push('Concept very long');
      score -= 2;
    } else {
      score += 3;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(5, score))
    };
  }

  /**
   * Validate difficulty
   */
  private static validateDifficulty(difficulty: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (typeof difficulty !== 'string') {
      errors.push('Difficulty must be a string');
      return { isValid: false, errors, warnings, score: 0 };
    }

    const normalizedDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

    if (!this.VALID_DIFFICULTIES.includes(normalizedDifficulty)) {
      errors.push(`Invalid difficulty "${difficulty}". Must be one of: ${this.VALID_DIFFICULTIES.join(', ')}`);
      score -= 5;
    } else {
      score += 3;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(5, score))
    };
  }

  /**
   * Validate complete context object
   */
  static validateContextObject(context: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalScore = 0;

    if (!context || typeof context !== 'object') {
      return {
        isValid: false,
        errors: ['Context must be an object'],
        warnings: [],
        score: 0
      };
    }

    // Validate concepts
    if (!context.concepts) {
      errors.push('Missing concepts array');
    } else if (!Array.isArray(context.concepts)) {
      errors.push('Concepts must be an array');
    } else {
      if (context.concepts.length === 0) {
        warnings.push('No concepts provided');
        totalScore -= 5;
      } else if (context.concepts.length > 10) {
        warnings.push('Too many concepts (recommended max 10)');
        totalScore -= 3;
      } else {
        totalScore += 10;
      }
    }

    // Validate summary
    if (!context.summary) {
      errors.push('Missing summary');
    } else if (typeof context.summary !== 'string') {
      errors.push('Summary must be a string');
    } else if (context.summary.trim().length < 20) {
      warnings.push('Summary very short');
      totalScore -= 3;
    } else if (context.summary.trim().length > 500) {
      warnings.push('Summary very long');
      totalScore -= 2;
    } else {
      totalScore += 10;
    }

    // Validate difficulty
    if (!context.difficulty) {
      errors.push('Missing difficulty');
    } else {
      const diffValidation = this.validateDifficulty(context.difficulty);
      errors.push(...diffValidation.errors);
      warnings.push(...diffValidation.warnings);
      totalScore += diffValidation.score;
    }

    // Validate questions array
    if (!context.questions) {
      errors.push('Missing questions array');
    } else if (!Array.isArray(context.questions)) {
      errors.push('Questions must be an array');
    } else if (context.questions.length === 0) {
      errors.push('No questions provided');
    } else {
      let validQuestions = 0;
      let questionScores = 0;

      for (let i = 0; i < context.questions.length; i++) {
        const questionValidation = this.validateQuestion(context.questions[i]);
        
        if (questionValidation.isValid) {
          validQuestions++;
          questionScores += questionValidation.score;
        }
        
        errors.push(...questionValidation.errors.map(e => `Question ${i + 1}: ${e}`));
        warnings.push(...questionValidation.warnings.map(w => `Question ${i + 1}: ${w}`));
      }

      if (validQuestions === 0) {
        errors.push('No valid questions found');
      } else {
        const averageQuestionScore = questionScores / context.questions.length;
        totalScore += Math.round(averageQuestionScore * 0.4); // Questions are 40% of total score
        
        if (validQuestions < context.questions.length) {
          warnings.push(`${context.questions.length - validQuestions} questions failed validation`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, totalScore))
    };
  }

  /**
   * Filter questions by quality score
   */
  static filterQuestionsByQuality(questions: any[], minScore: number = 70): QuestionValidation[] {
    const validQuestions: QuestionValidation[] = [];

    for (const question of questions) {
      const validation = this.validateQuestion(question);
      
      if (validation.isValid && validation.score >= minScore) {
        validQuestions.push(question);
      }
    }

    return validQuestions;
  }

  /**
   * Quick validation for performance-critical scenarios
   */
  static quickValidate(question: any): boolean {
    try {
      return (
        question &&
        typeof question === 'object' &&
        typeof question.question === 'string' &&
        Array.isArray(question.choices) &&
        question.choices.length >= 2 &&
        typeof question.answer === 'string' &&
        question.choices.includes(question.answer)
      );
    } catch {
      return false;
    }
  }
}

export default ValidationSystem;
