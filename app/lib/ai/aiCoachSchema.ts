// AI Coach Schema - Stream-Safe Validation
// Handles partial, inconsistent, and malformed LLM responses

import { z } from "zod";

// Stream-safe AI Coach schema
export const AICoachSchema = z.object({
  message: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
}).passthrough().catch({
  message: "AI temporarily unavailable",
  suggestions: ["Try rephrasing your question", "Check your internet connection"],
  confidence: 0.1,
  source: "fallback",
});

// Extended schema for different response types
export const AIResponseSchema = z.union([
  AICoachSchema,
  z.object({
    error: z.string(),
    fallback: z.boolean().optional(),
  }),
  z.object({
    response: z.string(),
    type: z.enum(['coach', 'explanation', 'suggestion']),
  })
]).catch({
  message: "Invalid AI response format",
  suggestions: ["Please try again"],
  confidence: 0.1,
  source: "validation-fallback",
});

// Safe parsing function
export function safeParseAI(data: any) {
  try {
    const result = AIResponseSchema.parse(data);
    
    // Log successful parsing
    if ('source' in result && result.source !== 'fallback' && result.source !== 'validation-fallback') {
      console.log('✅ AI response parsed successfully', { 
        source: result.source,
        confidence: result.confidence,
        messageLength: result.message?.length || 0
      });
    }
    
    return result;
  } catch (error) {
    console.warn("⚠️ AI schema rejected → fallback used", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: typeof data === 'object' ? Object.keys(data) : 'non-object'
    });
    
    return {
      message: "AI response could not be processed. Please try again.",
      suggestions: [
        "Rephrase your question",
        "Check your internet connection",
        "Try a simpler question"
      ],
      confidence: 0.1,
      source: "parse-fallback",
    };
  }
}

// Stream response handler
export function handleStreamResponse(chunk: any, accumulator: any = null) {
  try {
    // Handle different stream formats
    if (typeof chunk === 'string') {
      const parsed = JSON.parse(chunk);
      return safeParseAI(parsed);
    }
    
    if (chunk && typeof chunk === 'object') {
      return safeParseAI(chunk);
    }
    
    // If we have accumulator, merge with new chunk
    if (accumulator) {
      return safeParseAI({
        ...accumulator,
        ...chunk
      });
    }
    
    return safeParseAI(chunk);
  } catch (error) {
    console.warn("⚠️ Stream chunk processing failed → using accumulator", { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return accumulator || safeParseAI(null);
  }
}

// Validation for different AI providers
export const ProviderSchemas = {
  openai: AIResponseSchema,
  anthropic: AIResponseSchema,
  local: AIResponseSchema,
  fallback: AICoachSchema,
};

// Provider-specific parsing
export function parseForProvider(provider: keyof typeof ProviderSchemas, data: any) {
  const schema = ProviderSchemas[provider] || ProviderSchemas.fallback;
  
  try {
    return schema.parse(data);
  } catch (error) {
    console.warn(`⚠️ ${provider} schema rejected → fallback used`, { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return safeParseAI(data);
  }
}

// Export default safe parser
export default safeParseAI;
