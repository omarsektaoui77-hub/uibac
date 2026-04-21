// @ts-nocheck - Supabase type inference issues with database schema
import { createClient } from "@supabase/supabase-js"

/**
 * Safe Supabase client initialization.
 * 
 * This utility creates a Supabase client with the service role key for server-side operations.
 * It validates environment variables at runtime (not build time) to prevent build failures.
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL (public, exposed to browser)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations (server-side only)
 * 
 * @returns Supabase client instance
 * @throws Error if environment variables are missing at runtime
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// For serverless environments, create fresh client per request to avoid connection issues
// Lazy initialization is not suitable for Vercel serverless functions

/**
 * Get a fresh Supabase client instance.
 * In serverless environments, creates a new client per request to avoid connection pooling issues.
 * Throws an error if environment variables are missing at runtime.
 * 
 * @returns Supabase client instance
 * @throws Error if environment variables are missing at runtime
 */
export function getSupabase(): any {
  return getSupabaseClient()
}

/**
 * Create a new Supabase client instance with the anon key for client-side operations.
 * This is useful when you need a fresh client or want to use the anon key instead of service role.
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL (public, exposed to browser)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Anon key for client-side operations (public)
 * 
 * @returns Supabase client instance with anon key
 * @throws Error if environment variables are missing at runtime
 */
export function createSupabaseClientWithAnonKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}
