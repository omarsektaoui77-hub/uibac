// @ts-nocheck - Supabase type inference issues with database schema
import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export const runtime = "nodejs"

// Simple in-memory rate limiting for production (consider Redis for scale)
const signupAttempts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_ATTEMPTS = 5

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const record = signupAttempts.get(identifier)
  
  if (!record || now > record.resetTime) {
    signupAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return false
  }
  
  record.count++
  return true
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
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

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Rate limiting by IP (extract from headers in production)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
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

    return NextResponse.json(
      { message: "User created successfully", user: { id: authData.user.id, email } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
