// @ts-nocheck - Supabase type inference issues with database schema
import { createClient } from "@supabase/supabase-js"

/**
 * Get Supabase URL from environment variables.
 * Supports both NEXT_PUBLIC_ (client) and non-prefixed (server) versions.
 */
function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required")
  }
  return url
}

/**
 * Get Supabase anon key from environment variables.
 * Supports both non-prefixed (server) and NEXT_PUBLIC_ (client) versions.
 */
function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required")
  }
  return key
}

/**
 * Get Supabase service role key from environment variables.
 * This key has full database access and should ONLY be used for admin operations.
 */
function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required for admin operations")
  }
  return key
}

/**
 * Create Supabase client with anon key for user authentication.
 * This is the SECURE way to authenticate users - uses anon key which respects RLS policies.
 * 
 * @returns Supabase client instance with anon key
 * @throws Error if environment variables are missing
 */
export function getSupabaseAuthClient(): any {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Create Supabase client with service role key for admin operations.
 * WARNING: This key bypasses RLS and has full database access.
 * ONLY use for: user signup, admin scripts, secure server jobs.
 * NEVER use for user authentication.
 * 
 * @returns Supabase client instance with service role key
 * @throws Error if environment variables are missing
 */
export function getSupabaseAdminClient(): any {
  const supabaseUrl = getSupabaseUrl()
  const supabaseServiceKey = getSupabaseServiceRoleKey()
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Legacy function for backward compatibility.
 * Uses anon key for security (not service role).
 * 
 * @deprecated Use getSupabaseAuthClient() or getSupabaseAdminClient() explicitly
 * @returns Supabase client instance with anon key
 */
export function getSupabase(): any {
  return getSupabaseAuthClient()
}

/**
 * Create Supabase client with anon key for client-side operations.
 * 
 * @returns Supabase client instance with anon key
 * @throws Error if environment variables are missing
 */
export function createSupabaseClientWithAnonKey() {
  return getSupabaseAuthClient()
}
