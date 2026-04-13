// Zero-Cost Local AI Integration using Ollama

export interface LocalLLMResponse {
  success: boolean;
  response?: string;
  error?: string;
  cached?: boolean;
}

export interface LocalAIConfig {
  model: string;
  baseUrl: string;
  timeout: number;
  maxTokens: number;
}

class LocalAI {
  private config: LocalAIConfig;
  private cache: Map<string, any> = new Map();

  constructor(config?: Partial<LocalAIConfig>) {
    this.config = {
      model: 'mistral',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      timeout: 30000,
      maxTokens: 800,
      ...config
    };
  }

  /**
   * Call local LLM with aggressive caching
   */
  async call(prompt: string, useCache: boolean = true): Promise<LocalLLMResponse> {
    const cacheKey = this.generateCacheKey(prompt);
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { success: true, response: cached, cached: true };
      }
    }

    try {
      const response = await this.makeRequest(prompt);
      
      if (response.success && response.response) {
        // Cache the result
        if (useCache) {
          this.cache.set(cacheKey, response.response);
        }
      }
      
      return response;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Make actual request to Ollama
   */
  private async makeRequest(prompt: string): Promise<LocalLLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: this.optimizePrompt(prompt),
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: this.config.maxTokens
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return { success: true, response: data.response };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Optimize prompt to reduce tokens
   */
  private optimizePrompt(prompt: string): string {
    // Remove redundant whitespace
    let optimized = prompt.replace(/\s+/g, ' ').trim();
    
    // Limit input size aggressively
    if (optimized.length > 3000) {
      optimized = optimized.substring(0, 3000) + '...';
    }
    
    return optimized;
  }

  /**
   * Generate cache key for prompt
   */
  private generateCacheKey(prompt: string): string {
    // Simple hash for cache key
    const hash = this.simpleHash(prompt + this.config.model);
    return `llm_${hash}`;
  }

  /**
   * Simple hash function
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
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const localAI = new LocalAI();

/**
 * Fallback local translation using simple patterns
 */
export function localTranslate(text: string, targetLang: string): string {
  // Very basic translation patterns for common phrases
  const translations: Record<string, Record<string, string>> = {
    "Calculate the derivative": {
      ar: "fire! Calculate the derivative and show your skills!",
      fr: "Calculez la dérivée",
      es: "Calcula la derivada"
    },
    "What is": {
      ar: "What is",
      fr: "Qu'est-ce que",
      es: "Qué es"
    },
    "Find": {
      ar: "Find",
      fr: "Trouvez",
      es: "Encuentra"
    }
  };

  // Apply simple translations
  let translated = text;
  for (const [english, variants] of Object.entries(translations)) {
    if (text.includes(english) && variants[targetLang]) {
      translated = translated.replace(english, variants[targetLang]);
    }
  }

  // Add Arabic optimization
  if (targetLang === 'ar') {
    translated = addArabicOptimization(translated);
  }

  return translated;
}

/**
 * Add Arabic motivational elements
 */
function addArabicOptimization(text: string): string {
  const motivationalPrefixes = ['fire! ', 'show your skills! ', 'prove yourself! '];
  const emojis = ['fire', 'star', 'trophy'];
  
  // Add random prefix
  const prefix = motivationalPrefixes[Math.floor(Math.random() * motivationalPrefixes.length)];
  
  // Add emoji if not present
  if (!text.includes('fire') && !text.includes('star')) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    text = `${prefix}${text} ${emoji}`;
  }
  
  return text;
}

export default LocalAI;
