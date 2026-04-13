// Production Environment Configuration with Zod Validation
// Secure, typed, and fail-fast environment system

import { z } from 'zod';
import { logger } from '../logging/logger';

// URL validation helper
const urlSchema = z.string().url().min(1);
const nonEmptyString = z.string().min(1, 'Required field cannot be empty');
const positiveNumber = z.number().min(0, 'Must be a positive number');
const percentageNumber = z.number().min(0).max(1, 'Must be between 0 and 1');

// Server Environment Schema (Private/Secret)
export const serverEnvSchema = z.object({
  // AI Provider Configuration
  OPENAI_API_KEY: nonEmptyString.describe('OpenAI API key for AI tutor'),
  ANTHROPIC_API_KEY: z.string().optional().describe('Anthropic API key (optional)'),
  OLLAMA_BASE_URL: z.string().optional().describe('Ollama local LLM URL (optional)'),
  
  // Firebase Configuration
  FIREBASE_PRIVATE_KEY: nonEmptyString.describe('Firebase service account private key'),
  FIREBASE_CLIENT_EMAIL: nonEmptyString.describe('Firebase service account email'),
  FIREBASE_PROJECT_ID: nonEmptyString.describe('Firebase project ID'),
  FIREBASE_DATABASE_URL: urlSchema.describe('Firebase Realtime Database URL'),
  
  // Database Configuration
  REDIS_URL: z.string().optional().describe('Redis connection URL (optional)'),
  
  // Monitoring & Analytics
  SENTRY_DSN: z.string().optional().describe('Sentry error tracking DSN (optional)'),
  GOOGLE_ANALYTICS_ID: z.string().optional().describe('Google Analytics measurement ID (optional)'),
  
  // Security
  JWT_SECRET: nonEmptyString.describe('JWT signing secret'),
  ENCRYPTION_KEY: nonEmptyString.describe('Data encryption key'),
  
  // API Configuration
  API_RATE_LIMIT: positiveNumber.default(100).describe('API rate limit per minute'),
  API_TIMEOUT: positiveNumber.default(30000).describe('API timeout in milliseconds'),
  
  // Build & Deployment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BUILD_NUMBER: z.string().optional().describe('Build number for tracking'),
  COMMIT_SHA: z.string().optional().describe('Git commit SHA for deployment tracking'),
});

// Client Environment Schema (Public)
export const clientEnvSchema = z.object({
  // Public URLs
  NEXT_PUBLIC_APP_URL: urlSchema.describe('Public application URL'),
  NEXT_PUBLIC_API_URL: urlSchema.describe('Public API endpoint URL'),
  
  // Firebase Public Config
  NEXT_PUBLIC_FIREBASE_API_KEY: nonEmptyString.describe('Firebase public API key'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: nonEmptyString.describe('Firebase auth domain'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: nonEmptyString.describe('Firebase storage bucket name'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: nonEmptyString.describe('Firebase messaging sender ID'),
  NEXT_PUBLIC_FIREBASE_APP_ID: nonEmptyString.describe('Firebase app ID'),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional().describe('Firebase measurement ID'),
  
  // AI Configuration (Public)
  NEXT_PUBLIC_AI_PROVIDER: z.enum(['openai', 'anthropic', 'ollama']).default('openai'),
  NEXT_PUBLIC_AI_MODEL: z.string().default('gpt-3.5-turbo'),
  NEXT_PUBLIC_AI_MAX_TOKENS: positiveNumber.default(2000),
  
  // Chaos Mode Configuration
  NEXT_PUBLIC_CHAOS_THRESHOLD: percentageNumber.default(0.05).describe('Chaos mode failure rate (0-1)'),
  NEXT_PUBLIC_CHAOS_ENABLED: z.enum(['true', 'false']).default('false').describe('Enable chaos mode'),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_AI_TUTOR: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_ENABLE_GAMIFICATION: z.enum(['true', 'false']).default('true'),
  
  // Performance Configuration
  NEXT_PUBLIC_BUNDLE_ANALYZER: z.enum(['true', 'false']).default('false'),
  NEXT_PUBLIC_DEBUG_MODE: z.enum(['true', 'false']).default('false'),
});

// Type inference
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Environment validation function
export function validateEnv(): { server: ServerEnv; client: ClientEnv } {
  // Validate server environment
  const serverEnvResult = serverEnvSchema.safeParse(process.env);
  
  if (!serverEnvResult.success) {
    const errorMessages = serverEnvResult.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join('\n');
    
    logger.error('❌ SERVER ENVIRONMENT VALIDATION FAILED', new Error(errorMessages));
    console.error('🚨 Server Environment Validation Error:');
    console.error(errorMessages);
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    
    throw new Error(`Server environment validation failed:\n${errorMessages}`);
  }

  // Validate client environment
  const clientEnvResult = clientEnvSchema.safeParse(process.env);
  
  if (!clientEnvResult.success) {
    const errorMessages = clientEnvResult.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join('\n');
    
    logger.error('❌ CLIENT ENVIRONMENT VALIDATION FAILED', new Error(errorMessages));
    console.error('🚨 Client Environment Validation Error:');
    console.error(errorMessages);
    console.error('\n💡 Please check your NEXT_PUBLIC_ variables.');
    
    throw new Error(`Client environment validation failed:\n${errorMessages}`);
  }

  logger.info('✅ Environment validation successful', {
    nodeEnv: serverEnvResult.data.NODE_ENV,
    chaosEnabled: clientEnvResult.data.NEXT_PUBLIC_CHAOS_ENABLED,
    aiProvider: clientEnvResult.data.NEXT_PUBLIC_AI_PROVIDER,
  });

  return {
    server: serverEnvResult.data,
    client: clientEnvResult.data,
  };
}

// Environment accessors with type safety
let _env: ReturnType<typeof validateEnv> | null = null;

export function getEnv(): ReturnType<typeof validateEnv> {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

// Server-only environment access
export function getServerEnv(): ServerEnv {
  const env = getEnv();
  return env.server;
}

// Client-safe environment access
export function getClientEnv(): ClientEnv {
  const env = getEnv();
  return env.client;
}

// Feature flag helpers
export function isFeatureEnabled(feature: keyof Pick<ClientEnv, 'NEXT_PUBLIC_ENABLE_AI_TUTOR' | 'NEXT_PUBLIC_ENABLE_ANALYTICS' | 'NEXT_PUBLIC_ENABLE_GAMIFICATION'>): boolean {
  const clientEnv = getClientEnv();
  return clientEnv[feature] === 'true';
}

// Chaos mode helper
export function isChaosModeEnabled(): boolean {
  const clientEnv = getClientEnv();
  return clientEnv.NEXT_PUBLIC_CHAOS_ENABLED === 'true' && clientEnv.NEXT_PUBLIC_CHAOS_THRESHOLD > 0;
}

// AI configuration helper
export function getAIConfig() {
  const clientEnv = getClientEnv();
  const serverEnv = getServerEnv();
  
  return {
    provider: clientEnv.NEXT_PUBLIC_AI_PROVIDER,
    model: clientEnv.NEXT_PUBLIC_AI_MODEL,
    maxTokens: clientEnv.NEXT_PUBLIC_AI_MAX_TOKENS,
    apiKey: serverEnv.OPENAI_API_KEY, // Server-side only
    anthropicKey: serverEnv.ANTHROPIC_API_KEY, // Server-side only
    ollamaUrl: serverEnv.OLLAMA_BASE_URL, // Server-side only
  };
}

// Firebase configuration helper
export function getFirebaseConfig() {
  const clientEnv = getClientEnv();
  const serverEnv = getServerEnv();
  
  return {
    // Client-side config
    apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serverEnv.FIREBASE_PROJECT_ID,
    storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: clientEnv.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    
    // Server-side config
    privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
    clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
    databaseUrl: serverEnv.FIREBASE_DATABASE_URL,
  };
}

// Export environment for client-side usage (NEXT_PUBLIC_ only)
export const env = getClientEnv();
