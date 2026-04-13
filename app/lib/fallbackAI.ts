// Zero-Dependency Fallback AI System
// Works completely offline without any AI models

export interface FallbackQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  xp: number;
  concept?: string;
}

export interface FallbackAnalysis {
  concepts: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  summary: string;
  formulas?: string[];
}

/**
 * Complete fallback system that works without AI
 * Uses pattern matching, templates, and rule-based logic
 */
export class FallbackAI {
  private conceptDatabase: Map<string, FallbackAnalysis> = new Map();
  private questionTemplates: Map<string, FallbackQuestion[]> = new Map();

  constructor() {
    this.initializeConceptDatabase();
    this.initializeQuestionTemplates();
  }

  /**
   * Analyze content without AI (pattern-based)
   */
  analyzeContent(text: string, fileId: string): FallbackAnalysis {
    // Check if we have cached analysis for this file
    if (this.conceptDatabase.has(fileId)) {
      return this.conceptDatabase.get(fileId)!;
    }

    const analysis = this.performPatternAnalysis(text);
    
    // Cache the analysis
    this.conceptDatabase.set(fileId, analysis);
    
    return analysis;
  }

  /**
   * Generate questions without AI (template-based)
   */
  generateQuestions(
    concepts: string[], 
    difficulty: string,
    language: string = 'en'
  ): FallbackQuestion[] {
    const cacheKey = `${concepts.join('_')}_${difficulty}`;
    
    // Check template cache
    if (this.questionTemplates.has(cacheKey)) {
      const templates = this.questionTemplates.get(cacheKey)!;
      return this.translateTemplates(templates, language);
    }

    // Generate from templates
    const questions = this.generateFromTemplates(concepts, difficulty);
    
    // Cache templates
    this.questionTemplates.set(cacheKey, questions);
    
    return this.translateTemplates(questions, language);
  }

  /**
   * Pattern-based content analysis
   */
  private performPatternAnalysis(text: string): FallbackAnalysis {
    const concepts = this.extractConceptsFromText(text);
    const difficulty = this.estimateDifficultyFromText(text);
    const summary = this.generateSummary(text);
    const formulas = this.extractFormulasFromText(text);

    return {
      concepts,
      difficulty,
      summary,
      formulas
    };
  }

  /**
   * Extract concepts using keyword patterns
   */
  private extractConceptsFromText(text: string): string[] {
    const conceptPatterns = {
      mathematics: [
        'derivative', 'integral', 'limit', 'function', 'equation', 'formula',
        'algebra', 'geometry', 'trigonometry', 'calculus', 'polynomial'
      ],
      physics: [
        'force', 'energy', 'motion', 'velocity', 'acceleration', 'mass',
        'gravity', 'momentum', 'work', 'power', 'wave'
      ],
      chemistry: [
        'atom', 'molecule', 'reaction', 'element', 'compound', 'bond',
        'acid', 'base', 'solution', 'concentration', 'oxidation'
      ],
      biology: [
        'cell', 'organism', 'genetics', 'evolution', 'ecosystem',
        'photosynthesis', 'respiration', 'protein', 'dna', 'enzyme'
      ]
    };

    const foundConcepts: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(conceptPatterns)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          foundConcepts.push(keyword);
        }
      }
    }

    // Remove duplicates and limit to 5 concepts
    return [...new Set(foundConcepts)].slice(0, 5);
  }

  /**
   * Estimate difficulty from text patterns
   */
  private estimateDifficultyFromText(text: string): 'easy' | 'medium' | 'hard' {
    const lowerText = text.toLowerCase();
    
    // Hard indicators
    const hardIndicators = [
      'complex', 'advanced', 'theorem', 'proof', 'derivation',
      'abstract', 'theoretical', 'sophisticated', 'intricate'
    ];
    
    // Easy indicators
    const easyIndicators = [
      'basic', 'simple', 'introduction', 'beginner', 'elementary',
      'fundamental', 'straightforward', 'basic concept'
    ];

    const hardCount = hardIndicators.filter(indicator => lowerText.includes(indicator)).length;
    const easyCount = easyIndicators.filter(indicator => lowerText.includes(indicator)).length;

    if (hardCount > easyCount) return 'hard';
    if (easyCount > hardCount) return 'easy';
    return 'medium';
  }

  /**
   * Generate summary from text
   */
  private generateSummary(text: string): string {
    // First sentence or first 100 characters
    const sentences = text.split(/[.!?]+/);
    if (sentences.length > 0 && sentences[0].trim().length > 20) {
      return sentences[0].trim() + '.';
    }
    
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }

  /**
   * Extract formulas using patterns
   */
  private extractFormulasFromText(text: string): string[] {
    const formulas: string[] = [];
    
    // Mathematical formula patterns
    const formulaPatterns = [
      /[a-z]+\s*=\s*[a-z0-9+\-*/()^]+/gi,
      /\([a-z0-9+\-*/()^]+\)\s*[=+\-*/]/gi,
      /[a-z]+\^ *[0-9]+/gi,
      /sqrt\([^)]+\)/gi,
      /integral|derivative|limit/gi
    ];

    for (const pattern of formulaPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        formulas.push(...matches.slice(0, 3)); // Limit to 3 formulas
      }
    }

    return [...new Set(formulas)];
  }

  /**
   * Generate questions from templates
   */
  private generateFromTemplates(concepts: string[], difficulty: string): FallbackQuestion[] {
    const questions: FallbackQuestion[] = [];
    
    // Generate 2-3 questions based on concepts
    for (let i = 0; i < Math.min(concepts.length, 3); i++) {
      const concept = concepts[i];
      const template = this.getQuestionTemplate(concept, difficulty);
      questions.push(template);
    }

    // Add at least one generic question if no concepts found
    if (questions.length === 0) {
      questions.push(this.getGenericQuestion(difficulty));
    }

    return questions;
  }

  /**
   * Get question template for concept
   */
  private getQuestionTemplate(concept: string, difficulty: string): FallbackQuestion {
    const templates = {
      derivative: {
        question: "What is the derivative of f(x) = x²?",
        choices: ["2x", "x²", "2", "x"],
        answer: "2x",
        explanation: "Using the power rule: d/dx(x²) = 2x",
        xp: 20
      },
      integral: {
        question: "What is the integral of 2x?",
        choices: ["x² + C", "2x²", "x", "2"],
        answer: "x² + C",
        explanation: "The integral of 2x is x² + constant",
        xp: 25
      },
      limit: {
        question: "What is lim(x->0) sin(x)/x?",
        choices: ["0", "1", "Infinity", "Undefined"],
        answer: "1",
        explanation: "This is a fundamental limit in calculus",
        xp: 30
      },
      force: {
        question: "What is Newton's second law?",
        choices: ["F = ma", "F = mv", "F = mg", "F = mv²"],
        answer: "F = ma",
        explanation: "Force equals mass times acceleration",
        xp: 20
      },
      energy: {
        question: "What is kinetic energy?",
        choices: ["½mv²", "mv", "mgh", "ma"],
        answer: "½mv²",
        explanation: "Kinetic energy equals half mass times velocity squared",
        xp: 25
      }
    };

    // Return template or generic
    return templates[concept as keyof typeof templates] || this.getGenericQuestion(difficulty);
  }

  /**
   * Get generic question for any topic
   */
  private getGenericQuestion(difficulty: string): FallbackQuestion {
    const baseXP = difficulty === 'easy' ? 15 : difficulty === 'hard' ? 35 : 25;
    
    return {
      question: "What is the main principle discussed in this lesson?",
      choices: ["Principle A", "Principle B", "Principle C", "Principle D"],
      answer: "Principle A",
      explanation: "This is the fundamental concept covered",
      xp: baseXP
    };
  }

  /**
   * Translate templates to target language
   */
  private translateTemplates(questions: FallbackQuestion[], targetLang: string): FallbackQuestion[] {
    if (targetLang === 'en') return questions;

    return questions.map(q => ({
      ...q,
      question: this.translateText(q.question, targetLang),
      explanation: this.translateText(q.explanation, targetLang),
      choices: q.choices.map(choice => this.translateText(choice, targetLang))
    }));
  }

  /**
   * Simple translation without API
   */
  private translateText(text: string, targetLang: string): string {
    const translations: Record<string, Record<string, string>> = {
      "What is the derivative of f(x) = x²?": {
        ar: "fire! What is the derivative of f(x) = x²? show your skills!",
        fr: "Quelle est la dérivée de f(x) = x²?",
        es: "¿Cuál es la derivada de f(x) = x²?"
      },
      "Using the power rule: d/dx(x²) = 2x": {
        ar: "Using the power rule: d/dx(x²) = 2x fire!",
        fr: "En utilisant la règle de puissance: d/dx(x²) = 2x",
        es: "Usando la regla de potencia: d/dx(x²) = 2x"
      },
      "What is": {
        ar: "What is",
        fr: "Qu'est-ce que",
        es: "Qué es"
      },
      "Principle": {
        ar: "Principle",
        fr: "Principe",
        es: "Principio"
      }
    };

    // Apply translations
    let translated = text;
    for (const [english, variants] of Object.entries(translations)) {
      if (text.includes(english) && variants[targetLang]) {
        translated = translated.replace(english, variants[targetLang]);
      }
    }

    // Add Arabic optimization
    if (targetLang === 'ar') {
      translated = this.addArabicOptimization(translated);
    }

    return translated;
  }

  /**
   * Add Arabic motivational elements
   */
  private addArabicOptimization(text: string): string {
    const motivationalPrefixes = ['fire! ', 'show your skills! ', 'prove yourself! '];
    const emojis = ['fire', 'star', 'trophy'];
    
    // Add prefix if not present
    if (!text.includes('fire!') && !text.includes('show your skills')) {
      const prefix = motivationalPrefixes[Math.floor(Math.random() * motivationalPrefixes.length)];
      text = prefix + text;
    }
    
    // Add emoji if not present
    if (!text.includes('fire') && !text.includes('star') && !text.includes('trophy')) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      text = text + ' ' + emoji;
    }
    
    return text;
  }

  /**
   * Initialize concept database with common patterns
   */
  private initializeConceptDatabase(): void {
    // Pre-populate with common concept analyses
    const commonAnalyses: Record<string, FallbackAnalysis> = {
      'derivative': {
        concepts: ['derivative', 'calculus'],
        difficulty: 'medium',
        summary: 'Study of rates of change and slopes',
        formulas: ['d/dx(x^n) = nx^(n-1)']
      },
      'integral': {
        concepts: ['integral', 'calculus'],
        difficulty: 'medium',
        summary: 'Study of accumulation and areas',
        formulas: ['integral of x^n = x^(n+1)/(n+1)']
      }
    };

    for (const [key, analysis] of Object.entries(commonAnalyses)) {
      this.conceptDatabase.set(key, analysis);
    }
  }

  /**
   * Initialize question templates
   */
  private initializeQuestionTemplates(): void {
    // Pre-populate with common question templates
    const commonTemplates: Record<string, FallbackQuestion[]> = {
      'mathematics_medium': [
        {
          question: "What is the main concept in this mathematical topic?",
          choices: ["Concept A", "Concept B", "Concept C", "Concept D"],
          answer: "Concept A",
          explanation: "This is the fundamental mathematical principle",
          xp: 25
        }
      ]
    };

    for (const [key, templates] of Object.entries(commonTemplates)) {
      this.questionTemplates.set(key, templates);
    }
  }

  /**
   * Get system status
   */
  getStatus(): { available: boolean; concepts: number; templates: number } {
    return {
      available: true,
      concepts: this.conceptDatabase.size,
      templates: this.questionTemplates.size
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.conceptDatabase.clear();
    this.questionTemplates.clear();
  }
}

// Export singleton
export const fallbackAI = new FallbackAI();
