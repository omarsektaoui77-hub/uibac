// Multi-Model Strategy
* Cost-optimized AI model selection with fallback mechanisms

export interface ModelConfig {
  name: string;
  type: 'api' | 'local' | 'fallback';
  priority: number; // 1-10, higher is preferred
  costPerToken: number;
  maxTokens: number;
  averageLatency: number; // milliseconds
  reliability: number; // 0-1
  capabilities: {
    reasoning: boolean;
    creativity: boolean;
    speed: boolean;
    cost_effectiveness: boolean;
  };
  availability: boolean;
}

export interface ModelSelectionCriteria {
  prioritizeCost: boolean;
  prioritizeSpeed: boolean;
  prioritizeQuality: boolean;
  maxLatency?: number;
  maxCost?: number;
  requiredCapabilities: Array<keyof ModelConfig['capabilities']>;
}

export interface ModelPerformance {
  model: string;
  successRate: number;
  averageLatency: number;
  averageCost: number;
  errorRate: number;
  lastUsed: Date;
  totalRequests: number;
}

/**
 * Multi-Model Strategy Manager
* Intelligent model selection and fallback management
 */
export class MultiModelStrategy {
  private static models: Map<string, ModelConfig> = new Map();
  private static performance: Map<string, ModelPerformance> = new Map();
  private static initialized = false;

  /**
   * Initialize model configurations
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Define available models
    this.models.set('openai', {
      name: 'openai',
      type: 'api',
      priority: 9,
      costPerToken: 0.00002, // $0.02 per 1K tokens
      maxTokens: 4096,
      averageLatency: 1500,
      reliability: 0.95,
      capabilities: {
        reasoning: true,
        creativity: true,
        speed: false,
        cost_effectiveness: false
      },
      availability: !!process.env.OPENAI_API_KEY
    });

    this.models.set('gemini', {
      name: 'gemini',
      type: 'api',
      priority: 8,
      costPerToken: 0.00001, // $0.01 per 1K tokens
      maxTokens: 8192,
      averageLatency: 1200,
      reliability: 0.92,
      capabilities: {
        reasoning: true,
        creativity: true,
        speed: true,
        cost_effectiveness: true
      },
      availability: !!process.env.GEMINI_API_KEY
    });

    this.models.set('ollama', {
      name: 'ollama',
      type: 'local',
      priority: 6,
      costPerToken: 0, // Free
      maxTokens: 4096,
      averageLatency: 3000,
      reliability: 0.85,
      capabilities: {
        reasoning: true,
        creativity: false,
        speed: false,
        cost_effectiveness: true
      },
      availability: !!process.env.OLLAMA_HOST
    });

    this.models.set('fallback', {
      name: 'fallback',
      type: 'fallback',
      priority: 1,
      costPerToken: 0,
      maxTokens: 1000,
      averageLatency: 100,
      reliability: 1.0,
      capabilities: {
        reasoning: false,
        creativity: false,
        speed: true,
        cost_effectiveness: true
      },
      availability: true
    });

    // Initialize performance tracking
    for (const [name, config] of this.models.entries()) {
      if (!this.performance.has(name)) {
        this.performance.set(name, {
          model: name,
          successRate: config.reliability,
          averageLatency: config.averageLatency,
          averageCost: config.costPerToken * 1000, // Assume 1K tokens
          errorRate: 1 - config.reliability,
          lastUsed: new Date(),
          totalRequests: 0
        });
      }
    }

    this.initialized = true;
    console.log('Multi-Model Strategy initialized with', this.models.size, 'models');
  }

  /**
   * Select best model based on criteria
   */
  static selectModel(criteria: ModelSelectionCriteria): ModelConfig | null {
    if (!this.initialized) {
      this.initialize();
    }

    // Filter available models
    const availableModels = Array.from(this.models.values())
      .filter(model => model.availability)
      .filter(model => this.hasRequiredCapabilities(model, criteria.requiredCapabilities))
      .filter(model => criteria.maxLatency ? model.averageLatency <= criteria.maxLatency : true)
      .filter(model => criteria.maxCost ? model.costPerToken <= criteria.maxCost : true);

    if (availableModels.length === 0) {
      console.warn('No available models meet criteria, using fallback');
      return this.models.get('fallback') || null;
    }

    // Score models based on criteria
    const scoredModels = availableModels.map(model => ({
      model,
      score: this.calculateModelScore(model, criteria)
    }));

    // Sort by score and priority
    scoredModels.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.model.priority - a.model.priority;
    });

    return scoredModels[0].model;
  }

  /**
   * Get model fallback chain
   */
  static getFallbackChain(primaryModel: string): ModelConfig[] {
    if (!this.initialized) {
      this.initialize();
    }

    const primary = this.models.get(primaryModel);
    if (!primary) {
      return [this.models.get('fallback')!];
    }

    // Create fallback chain based on priority and availability
    const fallbacks = Array.from(this.models.values())
      .filter(model => model.name !== primaryModel && model.availability)
      .sort((a, b) => b.priority - a.priority);

    return [primary, ...fallbacks, this.models.get('fallback')!];
  }

  /**
   * Execute request with automatic fallback
   */
  static async executeWithFallback<T>(
    request: (model: ModelConfig) => Promise<T>,
    criteria: ModelSelectionCriteria
  ): Promise<{
    result: T;
    modelUsed: string;
    attempts: number;
    totalLatency: number;
    totalCost: number;
  }> {
    const startTime = Date.now();
    let attempts = 0;
    let totalCost = 0;

    // Select primary model
    const primaryModel = this.selectModel(criteria);
    if (!primaryModel) {
      throw new Error('No suitable model available');
    }

    const fallbackChain = this.getFallbackChain(primaryModel.name);

    for (const model of fallbackChain) {
      attempts++;
      
      try {
        console.log(`Attempting model: ${model.name} (attempt ${attempts})`);
        
        const result = await request(model);
        const latency = Date.now() - startTime;
        const estimatedCost = this.estimateCost(model, 1000); // Assume 1K tokens

        // Update performance metrics
        this.updatePerformance(model.name, {
          success: true,
          latency,
          cost: estimatedCost
        });

        return {
          result,
          modelUsed: model.name,
          attempts,
          totalLatency: latency,
          totalCost: estimatedCost
        };

      } catch (error) {
        console.error(`Model ${model.name} failed:`, error);
        
        // Update performance metrics
        this.updatePerformance(model.name, {
          success: false,
          latency: Date.now() - startTime,
          cost: 0
        });

        // If this is the fallback model, throw the error
        if (model.type === 'fallback') {
          throw error;
        }

        // Continue to next model in chain
        continue;
      }
    }

    throw new Error('All models failed');
  }

  /**
   * Get model performance statistics
   */
  static getModelPerformance(): Record<string, ModelPerformance> {
    const performance: Record<string, ModelPerformance> = {};
    
    for (const [name, perf] of this.performance.entries()) {
      performance[name] = { ...perf };
    }

    return performance;
  }

  /**
   * Get cost optimization recommendations
   */
  static getCostOptimizationRecommendations(): {
    recommendations: string[];
    potentialSavings: number;
    modelSwitches: Array<{ from: string; to: string; savings: number }>;
  } {
    const recommendations: string[] = [];
    const modelSwitches: Array<{ from: string; to: string; savings: number }> = [];
    let totalSavings = 0;

    const performance = this.getModelPerformance();

    // Analyze performance vs cost
    for (const [modelName, perf] of Object.entries(performance)) {
      const model = this.models.get(modelName);
      if (!model || model.type === 'fallback') continue;

      // Check if model is expensive but has low success rate
      if (model.costPerToken > 0.00001 && perf.successRate < 0.8) {
        // Find cheaper alternative
        const alternatives = Array.from(this.models.values())
          .filter(m => m.name !== modelName && m.availability)
          .filter(m => m.costPerToken < model.costPerToken)
          .filter(m => this.performance.get(m.name)?.successRate! > 0.7);

        for (const alt of alternatives) {
          const altPerf = this.performance.get(alt.name)!;
          if (altPerf.successRate >= perf.successRate * 0.9) { // Within 90% performance
            const savings = (model.costPerToken - alt.costPerToken) * perf.totalRequests * 1000;
            modelSwitches.push({
              from: modelName,
              to: alt.name,
              savings
            });
            totalSavings += savings;
            break;
          }
        }
      }
    }

    // Generate recommendations
    if (modelSwitches.length > 0) {
      recommendations.push('Consider switching to more cost-effective models for non-critical requests');
    }

    const highLatencyModels = Object.entries(performance)
      .filter(([, perf]) => perf.averageLatency > 2000)
      .map(([name]) => name);

    if (highLatencyModels.length > 0) {
      recommendations.push(`Consider optimizing prompts for faster models: ${highLatencyModels.join(', ')}`);
    }

    return {
      recommendations,
      potentialSavings: totalSavings,
      modelSwitches
    };
  }

  /**
   * Update model performance metrics
   */
  private static updatePerformance(
    modelName: string,
    result: { success: boolean; latency: number; cost: number }
  ): void {
    const perf = this.performance.get(modelName);
    if (!perf) return;

    perf.totalRequests++;
    perf.lastUsed = new Date();

    // Update success rate with exponential moving average
    const alpha = 0.1; // Smoothing factor
    const newSuccessRate = result.success ? 1 : 0;
    perf.successRate = perf.successRate * (1 - alpha) + newSuccessRate * alpha;
    perf.errorRate = 1 - perf.successRate;

    // Update average latency
    perf.averageLatency = perf.averageLatency * (1 - alpha) + result.latency * alpha;

    // Update average cost
    perf.averageCost = perf.averageCost * (1 - alpha) + result.cost * alpha;
  }

  /**
   * Check if model has required capabilities
   */
  private static hasRequiredCapabilities(
    model: ModelConfig,
    requiredCapabilities: Array<keyof ModelConfig['capabilities']>
  ): boolean {
    return requiredCapabilities.every(cap => model.capabilities[cap]);
  }

  /**
   * Calculate model score based on criteria
   */
  private static calculateModelScore(
    model: ModelConfig,
    criteria: ModelSelectionCriteria
  ): number {
    let score = 0;

    // Base score from priority
    score += model.priority * 10;

    // Cost optimization
    if (criteria.prioritizeCost) {
      score += (1 - model.costPerToken) * 50;
    }

    // Speed optimization
    if (criteria.prioritizeSpeed) {
      score += (1 - model.averageLatency / 5000) * 30; // Normalize to 5s max
    }

    // Quality optimization
    if (criteria.prioritizeQuality) {
      score += model.reliability * 40;
    }

    // Capability matching
    const capabilityScore = criteria.requiredCapabilities.length > 0
      ? criteria.requiredCapabilities.filter(cap => model.capabilities[cap]).length / criteria.requiredCapabilities.length
      : 1;
    score += capabilityScore * 20;

    return score;
  }

  /**
   * Estimate cost for model usage
   */
  private static estimateCost(model: ModelConfig, tokens: number): number {
    return model.costPerToken * tokens;
  }

  /**
   * Get model health check
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    models: Record<string, {
      available: boolean;
      latency: number;
      lastChecked: Date;
    }>;
  }> {
    const results: Record<string, {
      available: boolean;
      latency: number;
      lastChecked: Date;
    }> = {};

    for (const [name, model] of this.models.entries()) {
      const startTime = Date.now();
      let available = false;
      let latency = 0;

      try {
        if (model.type === 'api') {
          // Test API connectivity
          available = await this.testAPIModel(model);
        } else if (model.type === 'local') {
          // Test local model connectivity
          available = await this.testLocalModel(model);
        } else {
          // Fallback is always available
          available = true;
        }
        latency = Date.now() - startTime;
      } catch (error) {
        available = false;
        latency = Date.now() - startTime;
      }

      results[name] = {
        available,
        latency,
        lastChecked: new Date()
      };
    }

    const healthy = Object.values(results).some(result => result.available);

    return {
      healthy,
      models: results
    };
  }

  /**
   * Test API model connectivity
   */
  private static async testAPIModel(model: ModelConfig): Promise<boolean> {
    try {
      if (model.name === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        });
        return response.ok;
      } else if (model.name === 'gemini') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        return response.ok;
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  /**
   * Test local model connectivity
   */
  private static async testLocalModel(model: ModelConfig): Promise<boolean> {
    try {
      if (model.name === 'ollama') {
        const response = await fetch(`${process.env.OLLAMA_HOST}/api/tags`);
        return response.ok;
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  /**
   * Reset performance metrics
   */
  static resetPerformanceMetrics(): void {
    for (const [name, config] of this.models.entries()) {
      this.performance.set(name, {
        model: name,
        successRate: config.reliability,
        averageLatency: config.averageLatency,
        averageCost: config.costPerToken * 1000,
        errorRate: 1 - config.reliability,
        lastUsed: new Date(),
        totalRequests: 0
      });
    }
  }
}

export default MultiModelStrategy;
