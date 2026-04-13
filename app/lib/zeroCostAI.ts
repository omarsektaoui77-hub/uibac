import { localAI, localTranslate } from './localAI';

export interface ZeroCostAnalysis {
  concepts: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  summary: string;
  formulas?: string[];
}

export interface ZeroCostQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  xp: number;
  concept?: string;
}

/**
 * Zero-Cost AI Pipeline
 * Uses local models + aggressive caching + reuse strategies
 */
export class ZeroCostAI {
  private conceptCache: Map<string, ZeroCostAnalysis> = new Map();
  private questionCache: Map<string, ZeroCostQuestion[]> = new Map();

  /**
   * Analyze PDF content with local AI
   */
  async analyzeContent(text: string, fileId: string): Promise<ZeroCostAnalysis> {
    // Check cache first (CRITICAL: avoid re-analysis)
    if (this.conceptCache.has(fileId)) {
      return this.conceptCache.get(fileId)!;
    }

    // Limit input aggressively
    const limitedText = text.substring(0, 2000); // Even more aggressive

    const prompt = `Analyze Moroccan lesson. Return JSON:
{
  "concepts": ["concept1", "concept2"],
  "difficulty": "easy|medium|hard", 
  "summary": "short summary"
}

TEXT: ${limitedText}`;

    try {
      const response = await localAI.call(prompt);
      
      if (response.success && response.response) {
        const analysis = this.parseAnalysis(response.response);
        
        // Cache permanently
        this.conceptCache.set(fileId, analysis);
        return analysis;
      }
    } catch (error) {
      console.error('Local AI analysis failed:', error);
    }

    // Fallback analysis
    return this.fallbackAnalysis(text);
  }

  /**
   * Generate questions from concepts (single language)
   */
  async generateQuestions(
    concepts: string[], 
    difficulty: string,
    language: string = 'en'
  ): Promise<ZeroCostQuestion[]> {
    const cacheKey = `${concepts.join('_')}_${difficulty}`;
    
    // Check cache first
    if (this.questionCache.has(cacheKey)) {
      const cached = this.questionCache.get(cacheKey)!;
      return this.translateQuestions(cached, language);
    }

    // Generate in base language (English) only
    const prompt = `Generate 3 questions. JSON:
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

    try {
      const response = await localAI.call(prompt);
      
      if (response.success && response.response) {
        const questions = this.parseQuestions(response.response);
        
        // Cache base questions
        this.questionCache.set(cacheKey, questions);
        
        // Translate if needed
        return this.translateQuestions(questions, language);
      }
    } catch (error) {
      console.error('Local AI question generation failed:', error);
    }

    // Fallback questions
    return this.fallbackQuestions(concepts, difficulty, language);
  }

  /**
   * Translate questions locally (no API calls)
   */
  private translateQuestions(questions: ZeroCostQuestion[], targetLang: string): ZeroCostQuestion[] {
    if (targetLang === 'en') return questions;

    return questions.map(q => ({
      ...q,
      question: localTranslate(q.question, targetLang),
      explanation: localTranslate(q.explanation, targetLang),
      choices: q.choices.map(choice => localTranslate(choice, targetLang))
    }));
  }

  /**
   * Parse analysis from AI response
   */
  private parseAnalysis(response: string): ZeroCostAnalysis {
    try {
      const parsed = JSON.parse(response);
      return {
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts.slice(0, 5) : ['General'],
        difficulty: parsed.difficulty || 'medium',
        summary: parsed.summary || 'Lesson content',
        formulas: parsed.formulas || []
      };
    } catch {
      return this.fallbackAnalysis(response);
    }
  }

  /**
   * Parse questions from AI response
   */
  private parseQuestions(response: string): ZeroCostQuestion[] {
    try {
      const parsed = JSON.parse(response);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      
      return questions.slice(0, 3).map((q: any) => ({
        question: q.question || 'Sample question',
        choices: Array.isArray(q.choices) ? q.choices : ['A', 'B', 'C', 'D'],
        answer: q.answer || 'A',
        explanation: q.explanation || 'Explanation',
        xp: typeof q.xp === 'number' ? q.xp : 20
      }));
    } catch {
      return this.fallbackQuestions(['Math'], 'medium');
    }
  }

  /**
   * Fallback analysis (no AI needed)
   */
  private fallbackAnalysis(text: string): ZeroCostAnalysis {
    const concepts = this.extractConceptsFromText(text);
    const difficulty = this.estimateDifficulty(text);
    
    return {
      concepts,
      difficulty,
      summary: text.substring(0, 100) + '...',
      formulas: this.extractFormulas(text)
    };
  }

  /**
   * Fallback questions (no AI needed)
   */
  private fallbackQuestions(
    concepts: string[], 
    difficulty: string,
    language: string = 'en'
  ): ZeroCostQuestion[] {
    const baseQuestions = [
      {
        question: "What is the main concept in this topic?",
        choices: ["Concept A", "Concept B", "Concept C", "Concept D"],
        answer: "A",
        explanation: "This is the fundamental concept",
        xp: 20
      },
      {
        question: "Calculate the basic operation",
        choices: ["Result 1", "Result 2", "Result 3", "Result 4"],
        answer: "B",
        explanation: "Apply the standard formula",
        xp: 25
      },
      {
        question: "Which formula applies here?",
        choices: ["Formula 1", "Formula 2", "Formula 3", "Formula 4"],
        answer: "C",
        explanation: "Use the appropriate formula",
        xp: 30
      }
    ];

    return this.translateQuestions(baseQuestions, language);
  }

  /**
   * Extract concepts from text using patterns
   */
  private extractConceptsFromText(text: string): string[] {
    const concepts: string[] = [];
    
    // Common mathematical concepts
    const mathConcepts = ['derivative', 'integral', 'limit', 'function', 'equation', 'formula'];
    const physicsConcepts = ['force', 'energy', 'motion', 'velocity', 'acceleration'];
    const chemistryConcepts = ['atom', 'molecule', 'reaction', 'element', 'compound'];
    
    const allConcepts = [...mathConcepts, ...physicsConcepts, ...chemistryConcepts];
    
    for (const concept of allConcepts) {
      if (text.toLowerCase().includes(concept)) {
        concepts.push(concept);
      }
    }
    
    return concepts.length > 0 ? concepts.slice(0, 3) : ['General'];
  }

  /**
   * Estimate difficulty from text
   */
  private estimateDifficulty(text: string): 'easy' | 'medium' | 'hard' {
    const lowerText = text.toLowerCase();
    
    // Hard indicators
    if (lowerText.includes('complex') || lowerText.includes('advanced') || lowerText.includes('theorem')) {
      return 'hard';
    }
    
    // Easy indicators
    if (lowerText.includes('basic') || lowerText.includes('simple') || lowerText.includes('introduction')) {
      return 'easy';
    }
    
    return 'medium';
  }

  /**
   * Extract formulas from text
   */
  private extractFormulas(text: string): string[] {
    const formulas: string[] = [];
    
    // Simple formula patterns
    const formulaPattern = /([a-z]+\s*=\s*[a-z0-9+\-*/()^]+)/gi;
    const matches = text.match(formulaPattern);
    
    if (matches) {
      formulas.push(...matches.slice(0, 3));
    }
    
    return formulas;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { concepts: number; questions: number } {
    return {
      concepts: this.conceptCache.size,
      questions: this.questionCache.size
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.conceptCache.clear();
    this.questionCache.clear();
  }
}

// Export singleton
export const zeroCostAI = new ZeroCostAI();
