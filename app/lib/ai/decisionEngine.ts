// AI Decision Engine
// LLM-powered coaching decisions with structured prompts and responses

import { AIContext } from './contextEngine';

export interface AIRecommendation {
  focus_subject: string;
  reason: string;
  study_plan: string;
  motivation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number; // 0-1
  estimated_duration: number; // minutes
  expected_xp: number;
  learning_objectives: string[];
  risk_factors: string[];
}

export interface DecisionOptions {
  model?: 'openai' | 'gemini' | 'ollama' | 'fallback';
  temperature?: number;
  maxTokens?: number;
  includeContext?: boolean;
  personalizedPrompt?: boolean;
}

/**
 * AI Decision Engine
 * Core LLM-powered coaching system
 */
export class AIDecisionEngine {
  
  /**
   * Generate AI coaching recommendation
   */
  static async generateRecommendation(
    context: AIContext,
    options: DecisionOptions = {}
  ): Promise<AIRecommendation> {
    const {
      model = 'openai',
      temperature = 0.7,
      maxTokens = 800,
      includeContext = true,
      personalizedPrompt = true
    } = options;

    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(personalizedPrompt);
      
      // Build user prompt with context
      const userPrompt = this.buildUserPrompt(context, includeContext);
      
      // Call LLM
      const response = await this.callLLM(systemPrompt, userPrompt, {
        model,
        temperature,
        maxTokens
      });
      
      // Parse and validate response
      const recommendation = this.parseResponse(response);
      
      // Enhance with additional data
      return this.enhanceRecommendation(recommendation, context);
      
    } catch (error) {
      console.error('AI Decision Engine error:', error);
      return this.getFallbackRecommendation(context);
    }
  }

  /**
   * Build system prompt for AI coach
   */
  private static buildSystemPrompt(personalized: boolean): string {
    const basePrompt = `You are an elite academic coach specializing in Baccalaureate education, helping Moroccan students optimize their learning efficiency, motivation, and retention.

Your role is to analyze student performance data and provide intelligent, personalized recommendations that consider:
- Academic strengths and weaknesses across subjects
- Learning patterns and consistency
- Burnout risk and study habits
- Motivational factors and psychological readiness

You must respond in strict JSON format with the following structure:
{
  "focus_subject": "subject_name",
  "reason": "detailed_analysis_reason",
  "study_plan": "specific_actionable_plan",
  "motivation": "inspiring_motivational_message",
  "difficulty": "easy|medium|hard",
  "confidence": 0.0-1.0,
  "estimated_duration": minutes_number,
  "expected_xp": xp_number,
  "learning_objectives": ["objective1", "objective2"],
  "risk_factors": ["risk1", "risk2"]
}

Guidelines:
- Be specific and actionable in study plans
- Consider cultural context (Moroccan Baccalaureate system)
- Balance academic rigor with student well-being
- Provide realistic time estimates
- Include 2-3 clear learning objectives
- Identify potential risks or challenges
- Confidence should reflect data quality and clarity of patterns`;

    if (personalized) {
      return basePrompt + `

Personalization Guidelines:
- Reference specific student data and patterns
- Acknowledge recent achievements or struggles
- Adapt communication style to student's level
- Consider subject-specific challenges in Moroccan curriculum`;
    }

    return basePrompt;
  }

  /**
   * Build user prompt with context data
   */
  private static buildUserPrompt(context: AIContext, includeFullContext: boolean): string {
    if (!includeFullContext) {
      return `Analyze this student's performance and provide a coaching recommendation:

Current Level: ${context.stats.level} (${context.stats.rank})
Total XP: ${context.stats.xp}
Current Streak: ${context.stats.streak} days
Average Accuracy: ${context.stats.averageAccuracy}%

Subjects Performance: ${JSON.stringify(context.subjects, null, 2)}

Provide a recommendation focusing on the most critical learning opportunity.`;
    }

    return `Analyze this comprehensive student profile and provide personalized coaching recommendation:

=== STUDENT OVERVIEW ===
Level: ${context.stats.level} (${context.stats.rank})
Total XP: ${context.stats.xp}
Current Streak: ${context.stats.streak} days
Total Study Time: ${Math.round(context.stats.totalStudyTime / 60)} hours
Average Accuracy: ${context.stats.averageAccuracy}%

=== SUBJECT PERFORMANCE ===
${Object.entries(context.subjects).map(([subject, data]) => 
  `${subject.toUpperCase()}: Level ${data.level}, ${data.xp} XP, ${data.accuracy}% accuracy, ${data.questionsAnswered} questions, Strength: ${data.strength}/100`
).join('\n')}

=== LEARNING BEHAVIOR ===
Daily Usage: ${context.behavior.dailyUsageMinutes} minutes
Consistency Score: ${context.behavior.consistencyScore}/100
Session Frequency: ${context.behavior.sessionFrequency} sessions/day
Study Pattern: ${context.behavior.studyPattern}
Burnout Risk: ${context.behavior.burnoutRisk}
Peak Hours: ${context.behavior.peakHours.join(', ')}
Drop-off Subjects: ${context.behavior.dropOffPoints.join(', ')}

=== RECENT ACTIVITY (Last 7 Days) ===
${context.recentActivity.slice(0, 5).map(activity => 
  `${activity.subject}: +${activity.xpEarned} XP, ${activity.successRate}% success, ${activity.duration}min`
).join('\n')}

=== AI COACHING HISTORY ===
${context.aiHistory.slice(0, 3).map(history => 
  `Previous: ${history.recommendation} (Accepted: ${history.accepted}, Effectiveness: ${history.effectiveness})`
).join('\n')}

=== ANALYSIS REQUEST ===
Based on this comprehensive profile, provide a coaching recommendation that:
1. Addresses the most critical learning need
2. Considers burnout risk and study patterns
3. Builds on recent performance trends
4. Accounts for previous AI coaching effectiveness
5. Provides realistic, actionable guidance

Focus on what will have the biggest impact on this student's learning journey.`;
  }

  /**
   * Call LLM with retry logic
   */
  private static async callLLM(
    systemPrompt: string,
    userPrompt: string,
    options: {
      model: string;
      temperature: number;
      maxTokens: number;
    }
  ): Promise<string> {
    const { model, temperature, maxTokens } = options;

    try {
      switch (model) {
        case 'openai':
          return await this.callOpenAI(systemPrompt, userPrompt, { temperature, maxTokens });
        
        case 'gemini':
          return await this.callGemini(systemPrompt, userPrompt, { temperature, maxTokens });
        
        case 'ollama':
          return await this.callOllama(systemPrompt, userPrompt, { temperature, maxTokens });
        
        default:
          throw new Error(`Unsupported model: ${model}`);
      }
    } catch (error) {
      console.error(`LLM call failed for ${model}:`, error);
      
      // Try fallback model
      if (model !== 'fallback') {
        return this.callLLM(systemPrompt, userPrompt, { 
          ...options, 
          model: 'fallback' 
        });
      }
      
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  private static async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    options: { temperature: number; maxTokens: number }
  ): Promise<string> {
    const { temperature, maxTokens } = options;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Gemini API
   */
  private static async callGemini(
    systemPrompt: string,
    userPrompt: string,
    options: { temperature: number; maxTokens: number }
  ): Promise<string> {
    const { temperature, maxTokens } = options;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `System: ${systemPrompt}\n\nUser: ${userPrompt}` }
          ]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Call Ollama (local model)
   */
  private static async callOllama(
    systemPrompt: string,
    userPrompt: string,
    options: { temperature: number; maxTokens: number }
  ): Promise<string> {
    const { temperature, maxTokens } = options;
    
    const response = await fetch(`${process.env.OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        prompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}`,
        options: {
          temperature,
          num_predict: maxTokens,
          format: 'json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  /**
   * Parse and validate LLM response
   */
  private static parseResponse(response: string): AIRecommendation {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);
      
      // Validate required fields
      const required = ['focus_subject', 'reason', 'study_plan', 'motivation', 'difficulty', 'confidence'];
      for (const field of required) {
        if (!(field in parsed)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate field types and ranges
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error('Invalid confidence value');
      }

      if (!['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
        throw new Error('Invalid difficulty value');
      }

      return {
        focus_subject: parsed.focus_subject,
        reason: parsed.reason,
        study_plan: parsed.study_plan,
        motivation: parsed.motivation,
        difficulty: parsed.difficulty,
        confidence: parsed.confidence,
        estimated_duration: parsed.estimated_duration || 30,
        expected_xp: parsed.expected_xp || 20,
        learning_objectives: parsed.learning_objectives || [],
        risk_factors: parsed.risk_factors || []
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Enhance recommendation with additional data
   */
  private static enhanceRecommendation(
    recommendation: AIRecommendation,
    context: AIContext
  ): AIRecommendation {
    // Adjust XP based on subject and difficulty
    const subjectData = context.subjects[recommendation.focus_subject];
    if (subjectData) {
      const difficultyMultiplier = {
        easy: 0.8,
        medium: 1.0,
        hard: 1.3
      }[recommendation.difficulty];
      
      recommendation.expected_xp = Math.round(
        (10 + subjectData.level * 2) * difficultyMultiplier
      );
    }

    // Adjust duration based on student's average session length
    if (context.behavior.dailyUsageMinutes > 0) {
      const avgSession = Math.min(context.behavior.dailyUsageMinutes / context.behavior.sessionFrequency, 60);
      recommendation.estimated_duration = Math.round(
        Math.max(15, Math.min(45, avgSession))
      );
    }

    // Add burnout risk factor if high
    if (context.behavior.burnoutRisk === 'high' && !recommendation.risk_factors.includes('burnout')) {
      recommendation.risk_factors.push('burnout');
    }

    return recommendation;
  }

  /**
   * Get fallback recommendation
   */
  private static getFallbackRecommendation(context: AIContext): AIRecommendation {
    // Find weakest subject by strength
    const weakestSubject = Object.entries(context.subjects)
      .sort(([, a], [, b]) => a.strength - b.strength)[0];
    
    const subjectName = weakestSubject?.[0] || 'mathematics';
    const subjectData = weakestSubject?.[1];

    return {
      focus_subject: subjectName,
      reason: `Based on current performance analysis, ${subjectName} shows the most opportunity for improvement with a strength score of ${subjectData?.strength || 0}/100`,
      study_plan: `Practice fundamental concepts and review recent mistakes. Focus on building confidence before advancing to more complex topics.`,
      motivation: `Every expert was once a beginner. Your consistent effort in ${subjectName} will lead to breakthrough moments!`,
      difficulty: 'medium',
      confidence: 0.6,
      estimated_duration: 30,
      expected_xp: 25,
      learning_objectives: [
        'Improve understanding of core concepts',
        'Practice problem-solving techniques',
        'Build confidence through repetition'
      ],
      risk_factors: subjectData?.accuracy < 50 ? ['low confidence'] : []
    };
  }

  /**
   * Validate recommendation before returning
   */
  static validateRecommendation(recommendation: AIRecommendation): boolean {
    try {
      // Check all required fields
      const required = [
        'focus_subject', 'reason', 'study_plan', 'motivation', 
        'difficulty', 'confidence', 'estimated_duration', 'expected_xp'
      ];
      
      for (const field of required) {
        if (!(field in recommendation)) return false;
      }

      // Validate field values
      if (recommendation.confidence < 0 || recommendation.confidence > 1) return false;
      if (!['easy', 'medium', 'hard'].includes(recommendation.difficulty)) return false;
      if (recommendation.estimated_duration < 5 || recommendation.estimated_duration > 120) return false;
      if (recommendation.expected_xp < 5 || recommendation.expected_xp > 100) return false;

      return true;
    } catch (error) {
      return false;
    }
  }
}

export default AIDecisionEngine;
