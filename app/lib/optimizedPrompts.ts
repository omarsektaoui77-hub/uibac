// Ultra-Optimized Prompts for Zero-Cost AI Operations

/**
 * Minimal token prompts designed for local models
 * Every character counts for cost optimization
 */
export class OptimizedPrompts {
  
  /**
   * Ultra-short analysis prompt (under 100 tokens)
   */
  static getAnalysisPrompt(text: string): string {
    // Limit input to 1500 characters (aggressive)
    const limitedText = text.substring(0, 1500);
    
    return `Analyze lesson. JSON:
{
  "concepts": ["c1","c2"],
  "difficulty": "easy|medium|hard",
  "summary": "short"
}

${limitedText}`;
  }

  /**
   * Ultra-short question generation prompt (under 80 tokens)
   */
  static getQuestionPrompt(concepts: string[], difficulty: string): string {
    // Limit to 2 concepts max
    const limitedConcepts = concepts.slice(0, 2).join(',');
    
    return `Generate 2 Qs. JSON:
[{"q":"text","c":["A","B","C","D"],"a":"B","e":"short","xp":20}]
Concepts: ${limitedConcepts}
Diff: ${difficulty}`;
  }

  /**
   * Single-concept question prompt (even shorter)
   */
  static getSingleConceptPrompt(concept: string, difficulty: string): string {
    return `Q about ${concept}. JSON:
{"q":"text","c":["A","B","C","D"],"a":"B","e":"short","xp":20}
Diff: ${difficulty}`;
  }

  /**
   * Formula extraction prompt (minimal)
   */
  static getFormulaPrompt(text: string): string {
    const limitedText = text.substring(0, 1000);
    return `Extract formulas. JSON: ["f1","f2"]
${limitedText}`;
  }

  /**
   * Difficulty estimation prompt (ultra short)
   */
  static getDifficultyPrompt(text: string): string {
    const limitedText = text.substring(0, 500);
    return `Difficulty? easy|medium|hard. JSON: {"diff":"medium"}
${limitedText}`;
  }

  /**
   * Concept extraction prompt (minimal)
   */
  static getConceptPrompt(text: string): string {
    const limitedText = text.substring(0, 800);
    return `Main concepts? JSON: ["c1","c2","c3"]
${limitedText}`;
  }

  /**
   * Batch processing prompt (multiple operations in one call)
   */
  static getBatchPrompt(text: string): string {
    const limitedText = text.substring(0, 2000);
    return `Analyze lesson. JSON:
{
  "concepts": ["c1","c2"],
  "difficulty": "medium",
  "summary": "short",
  "formulas": ["f1"],
  "questions": [
    {"q":"text","c":["A","B","C","D"],"a":"B","e":"short","xp":20}
  ]
}
${limitedText}`;
  }

  /**
   * Translation prompt (if needed for local translation)
   */
  static getTranslationPrompt(text: string, targetLang: string): string {
    return `Translate to ${targetLang}. JSON: {"text":"translated"}
${text}`;
  }

  /**
   * Arabic optimization prompt (add motivational elements)
   */
  static getArabicOptimizationPrompt(text: string): string {
    return `Make Arabic motivational. Add emojis/fire. JSON: {"text":"optimized"}
${text}`;
  }
}

/**
 * Prompt templates for different model sizes
 */
export class ModelSpecificPrompts {
  
  /**
   * For smaller models (phi, llama3-8b)
   */
  static getSmallModelPrompt(text: string): string {
    return `Lesson: ${text.substring(0, 1000)}
JSON: {"concepts":["c1","c2"],"difficulty":"medium"}`;
  }

  /**
   * For medium models (mistral, llama3-70b)
   */
  static getMediumModelPrompt(text: string): string {
    return OptimizedPrompts.getAnalysisPrompt(text);
  }

  /**
   * For large models (if available)
   */
  static getLargeModelPrompt(text: string): string {
    return `Analyze Moroccan Baccalaureate lesson comprehensively. Return structured JSON with concepts, difficulty assessment, summary, and sample questions.
${text}`;
  }
}

/**
 * Token usage tracker
 */
export class TokenTracker {
  private tokensUsed = 0;
  private promptTokens = 0;
  private responseTokens = 0;

  /**
   * Estimate tokens (rough approximation: 1 token = 4 characters)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Track prompt usage
   */
  trackPrompt(prompt: string): void {
    const tokens = this.estimateTokens(prompt);
    this.promptTokens += tokens;
    this.tokensUsed += tokens;
  }

  /**
   * Track response usage
   */
  trackResponse(response: string): void {
    const tokens = this.estimateTokens(response);
    this.responseTokens += tokens;
    this.tokensUsed += tokens;
  }

  /**
   * Get usage statistics
   */
  getStats(): { total: number; prompt: number; response: number } {
    return {
      total: this.tokensUsed,
      prompt: this.promptTokens,
      response: this.responseTokens
    };
  }

  /**
   * Reset counters
   */
  reset(): void {
    this.tokensUsed = 0;
    this.promptTokens = 0;
    this.responseTokens = 0;
  }

  /**
   * Check if within budget (for free tiers)
   */
  isWithinBudget(maxTokens: number): boolean {
    return this.tokensUsed <= maxTokens;
  }
}

/**
 * Prompt optimizer that selects the best prompt based on context
 */
export class PromptOptimizer {
  private tokenTracker = new TokenTracker();

  /**
   * Get optimal prompt based on model and context
   */
  getOptimalPrompt(
    text: string, 
    task: 'analysis' | 'questions' | 'batch',
    modelSize: 'small' | 'medium' | 'large' = 'medium'
  ): string {
    let prompt: string;

    switch (task) {
      case 'analysis':
        if (modelSize === 'small') {
          prompt = ModelSpecificPrompts.getSmallModelPrompt(text);
        } else {
          prompt = OptimizedPrompts.getAnalysisPrompt(text);
        }
        break;
      
      case 'questions':
        prompt = OptimizedPrompts.getQuestionPrompt(['math'], 'medium');
        break;
      
      case 'batch':
        prompt = OptimizedPrompts.getBatchPrompt(text);
        break;
      
      default:
        prompt = OptimizedPrompts.getAnalysisPrompt(text);
    }

    this.tokenTracker.trackPrompt(prompt);
    return prompt;
  }

  /**
   * Get token usage statistics
   */
  getTokenStats(): { total: number; prompt: number; response: number } {
    return this.tokenTracker.getStats();
  }

  /**
   * Reset token tracking
   */
  resetTokens(): void {
    this.tokenTracker.reset();
  }

  /**
   * Optimize text length based on task
   */
  optimizeTextLength(text: string, task: 'analysis' | 'questions' | 'batch'): string {
    const limits = {
      analysis: 1500,
      questions: 800,
      batch: 2000
    };

    const limit = limits[task] || 1000;
    return text.substring(0, limit);
  }
}

// Export singleton
export const promptOptimizer = new PromptOptimizer();
export const tokenTracker = new TokenTracker();
