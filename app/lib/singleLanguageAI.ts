// Single-Language Generation with Local Translation
// Generate once in English, translate locally to avoid multiple AI calls

import { fallbackAI } from './fallbackAI';
import { cacheManager } from './aggressiveCache';

export interface TranslatedQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  xp: number;
  concept?: string;
  language: string;
}

export interface TranslationMap {
  [key: string]: {
    [lang: string]: string;
  };
}

/**
 * Single-language AI system with local translation
 * Generates content once, reuses across languages
 */
export class SingleLanguageAI {
  private baseLanguage = 'en';
  private translationCache: Map<string, { [lang: string]: string }> = new Map();
  private translationPatterns: { [english: string]: { [lang: string]: string } } = {};

  constructor() {
    this.initializeTranslationPatterns();
  }

  /**
   * Generate questions in base language only
   */
  async generateQuestionsBase(
    concepts: string[], 
    difficulty: string
  ): Promise<any[]> {
    const cacheKey = `base_${concepts.join('_')}_${difficulty}`;
    
    // Check cache first
    const cached = cacheManager.getQuestions(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate in base language only
    let questions: any[];
    
    try {
      // Try local AI first
      questions = await this.generateWithLocalAI(concepts, difficulty);
    } catch (error) {
      console.log('Local AI failed, using fallback:', error);
      // Fallback to template-based generation
      questions = fallbackAI.generateQuestions(concepts, difficulty, this.baseLanguage);
    }

    // Cache base questions
    cacheManager.cacheQuestions(cacheKey, questions);
    
    return questions;
  }

  /**
   * Translate questions to target language locally
   */
  translateQuestions(
    baseQuestions: any[], 
    targetLang: string
  ): TranslatedQuestion[] {
    if (targetLang === this.baseLanguage) {
      return baseQuestions.map(q => ({ ...q, language: this.baseLanguage }));
    }

    return baseQuestions.map(question => ({
      ...question,
      question: this.translateText(question.question, targetLang),
      choices: question.choices.map((choice: string) => this.translateText(choice, targetLang)),
      explanation: this.translateText(question.explanation, targetLang),
      language: targetLang
    }));
  }

  /**
   * Generate and translate in one step
   */
  async generateAndTranslate(
    concepts: string[], 
    difficulty: string, 
    targetLang: string
  ): Promise<TranslatedQuestion[]> {
    // Generate in base language
    const baseQuestions = await this.generateQuestionsBase(concepts, difficulty);
    
    // Translate locally
    return this.translateQuestions(baseQuestions, targetLang);
  }

  /**
   * Local translation without API calls
   */
  private translateText(text: string, targetLang: string): string {
    // Check translation cache
    const cacheKey = `${text}_${targetLang}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached && cached[targetLang]) {
      return cached[targetLang];
    }

    // Perform translation
    const translated = this.performTranslation(text, targetLang);
    
    // Cache translation
    if (!this.translationCache.has(cacheKey)) {
      this.translationCache.set(cacheKey, {});
    }
    const cacheEntry = this.translationCache.get(cacheKey)!;
    cacheEntry[targetLang] = translated;
    
    return translated;
  }

  /**
   * Perform translation using patterns and rules
   */
  private performTranslation(text: string, targetLang: string): string {
    let translated = text;

    // Apply translation patterns
    for (const [english, translations] of Object.entries(this.translationPatterns)) {
      if (text.includes(english) && translations[targetLang]) {
        translated = translated.replace(english, translations[targetLang]);
      }
    }

    // Apply language-specific optimizations
    if (targetLang === 'ar') {
      translated = this.applyArabicOptimization(translated);
    } else if (targetLang === 'fr') {
      translated = this.applyFrenchOptimization(translated);
    } else if (targetLang === 'es') {
      translated = this.applySpanishOptimization(translated);
    }

    return translated;
  }

  /**
   * Apply Arabic optimization (motivational elements)
   */
  private applyArabicOptimization(text: string): string {
    const motivationalPrefixes = ['fire! ', 'show your skills! ', 'prove yourself! ', 'challenge yourself! '];
    const emojis = ['fire', 'star', 'trophy', 'rocket'];
    
    // Add motivational prefix if not present
    if (!text.includes('fire!') && !text.includes('show your skills') && !text.includes('prove yourself')) {
      const prefix = motivationalPrefixes[Math.floor(Math.random() * motivationalPrefixes.length)];
      text = prefix + text;
    }
    
    // Add emoji if not present
    if (!text.includes('fire') && !text.includes('star') && !text.includes('trophy') && !text.includes('rocket')) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      text = text + ' ' + emoji;
    }
    
    // Add Arabic-specific phrases
    if (text.includes('calculate')) {
      text = text.replace('calculate', 'calculate and show your skills');
    }
    
    return text;
  }

  /**
   * Apply French optimization
   */
  private applyFrenchOptimization(text: string): string {
    // Add formal educational tone
    if (text.includes('what is')) {
      text = text.replace('what is', 'quelle est');
    }
    
    if (text.includes('calculate')) {
      text = text.replace('calculate', 'calculez');
    }
    
    return text;
  }

  /**
   * Apply Spanish optimization
   */
  private applySpanishOptimization(text: string): string {
    // Add engaging educational tone
    if (text.includes('what is')) {
      text = text.replace('what is', 'qué es');
    }
    
    if (text.includes('calculate')) {
      text = text.replace('calculate', 'calcula');
    }
    
    return text;
  }

  /**
   * Generate with local AI (if available)
   */
  private async generateWithLocalAI(concepts: string[], difficulty: string): Promise<any[]> {
    // This would integrate with the localAI system
    // For now, use fallback
    return fallbackAI.generateQuestions(concepts, difficulty, this.baseLanguage);
  }

  /**
   * Initialize translation patterns
   */
  private initializeTranslationPatterns(): void {
    this.translationPatterns = {
      // Common question phrases
      "What is": {
        ar: "What is",
        fr: "Qu'est-ce que",
        es: "Qué es"
      },
      "Calculate": {
        ar: "Calculate",
        fr: "Calculez",
        es: "Calcula"
      },
      "Find": {
        ar: "Find",
        fr: "Trouvez",
        es: "Encuentra"
      },
      "Which": {
        ar: "Which",
        fr: "Lequel",
        es: "Cuál"
      },
      "How": {
        ar: "How",
        fr: "Comment",
        es: "Cómo"
      },
      "Why": {
        ar: "Why",
        fr: "Pourquoi",
        es: "Por qué"
      },
      "When": {
        ar: "When",
        fr: "Quand",
        es: "Cuándo"
      },
      "Where": {
        ar: "Where",
        fr: "Où",
        es: "Dónde"
      },

      // Mathematical terms
      "derivative": {
        ar: "derivative",
        fr: "dérivée",
        es: "derivada"
      },
      "integral": {
        ar: "integral",
        fr: "intégrale",
        es: "integral"
      },
      "limit": {
        ar: "limit",
        fr: "limite",
        es: "límite"
      },
      "function": {
        ar: "function",
        fr: "fonction",
        es: "función"
      },
      "equation": {
        ar: "equation",
        fr: "équation",
        es: "ecuación"
      },
      "formula": {
        ar: "formula",
        fr: "formule",
        es: "fórmula"
      },

      // Physics terms
      "force": {
        ar: "force",
        fr: "force",
        es: "fuerza"
      },
      "energy": {
        ar: "energy",
        fr: "énergie",
        es: "energía"
      },
      "motion": {
        ar: "motion",
        fr: "mouvement",
        es: "movimiento"
      },
      "velocity": {
        ar: "velocity",
        fr: "vitesse",
        es: "velocidad"
      },
      "acceleration": {
        ar: "acceleration",
        fr: "accélération",
        es: "aceleración"
      },

      // Chemistry terms
      "atom": {
        ar: "atom",
        fr: "atome",
        es: "átomo"
      },
      "molecule": {
        ar: "molecule",
        fr: "molécule",
        es: "molécula"
      },
      "reaction": {
        ar: "reaction",
        fr: "réaction",
        es: "reacción"
      },
      "element": {
        ar: "element",
        fr: "élément",
        es: "elemento"
      },

      // Common answer choices
      "Option A": {
        ar: "Option A",
        fr: "Option A",
        es: "Opción A"
      },
      "Option B": {
        ar: "Option B",
        fr: "Option B",
        es: "Opción B"
      },
      "Option C": {
        ar: "Option C",
        fr: "Option C",
        es: "Opción C"
      },
      "Option D": {
        ar: "Option D",
        fr: "Option D",
        es: "Opción D"
      },

      // Explanations
      "Using the power rule": {
        ar: "Using the power rule fire!",
        fr: "En utilisant la règle de puissance",
        es: "Usando la regla de potencia"
      },
      "This is the correct answer": {
        ar: "This is the correct answer show your skills!",
        fr: "C'est la bonne réponse",
        es: "Esta es la respuesta correcta"
      },
      "The fundamental concept": {
        ar: "The fundamental concept prove yourself!",
        fr: "Le concept fondamental",
        es: "El concepto fundamental"
      }
    };
  }

  /**
   * Add new translation pattern
   */
  addTranslationPattern(english: string, translations: { [lang: string]: string }): void {
    this.translationPatterns[english] = translations;
  }

  /**
   * Get translation statistics
   */
  getTranslationStats(): { patterns: number; cacheSize: number } {
    return {
      patterns: Object.keys(this.translationPatterns).length,
      cacheSize: this.translationCache.size
    };
  }

  /**
   * Clear translation cache
   */
  clearTranslationCache(): void {
    this.translationCache.clear();
  }

  /**
   * Export translation data
   */
  exportTranslations(): { [english: string]: { [lang: string]: string } } {
    return this.translationPatterns;
  }

  /**
   * Import translation data
   */
  importTranslations(data: { [english: string]: { [lang: string]: string } }): void {
    this.translationPatterns = { ...this.translationPatterns, ...data };
  }
}

// Export singleton
export const singleLanguageAI = new SingleLanguageAI();
