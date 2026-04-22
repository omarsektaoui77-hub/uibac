// @ts-nocheck - Supabase type inference issues with database schema
import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/infra/db/supabase"
import { APILogger } from "@/infra/logging/api-logger"
import { RateLimiter } from "@/infra/logging/rate-limiter"
import { PasswordValidator } from "@/core/auth/password-validator"

export const runtime = "nodejs"

export async function POST(request: Request) {
  APILogger.logRequest(request as any)
  
  try {
    const supabase = getSupabaseAdminClient()
    const { email, password, name } = await request.json()

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Password strength validation using new validator
    const passwordValidation = PasswordValidator.validate(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { 
          error: passwordValidation.errors.join(', '),
          requirements: PasswordValidator.getRequirements()
        },
        { status: 400 }
      )
    }

    // Rate limiting by IP using new RateLimiter
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = RateLimiter.checkSignupLimit(ip)
    
    if (!rateLimitResult.allowed) {
      APILogger.logAuth('signup', false, email, { reason: 'rate_limit_exceeded', ip })
      return NextResponse.json(
        { 
          error: "Too many signup attempts. Please try again later.",
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (authError) {
      console.error("Supabase signup error:", authError.message)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create profile record
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        full_name: name,
        username: email.split("@")[0],
        created_at: new Date().toISOString(),
      })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      // User created but profile failed - still return success
    }

    APILogger.logAuth('signup', true, email)
    APILogger.logSuccess(request as any, { userId: authData.user.id })
    
    return NextResponse.json(
      { message: "User created successfully", user: { id: authData.user.id, email } },
      { status: 201 }
    )
  } catch (error) {
    APILogger.logError(error, request as any)
    APILogger.logAuth('signup', false, undefined, { error: error instanceof Error ? error.message : 'Unknown' })
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
