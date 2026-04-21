// @ts-nocheck - Supabase type inference issues with database schema
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getSupabase } from "./supabase"

// Validate critical environment variables at module load time
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET
const NEXTAUTH_URL = process.env.NEXTAUTH_URL

if (!NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET environment variable is required in production. " +
    "Generate one with: openssl rand -base64 32"
  )
}

if (!NEXTAUTH_URL) {
  console.warn(
    "NEXTAUTH_URL not set. Using default from request headers. " +
    "For production, set NEXTAUTH_URL=https://uibac.vercel.app"
  )
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  url: NEXTAUTH_URL,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const supabase = getSupabaseAuthClient()
          const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email: credentials!.email,
            password: credentials!.password,
          })

          if (error) {
            console.error("Supabase auth error:", error.message)
            return null
          }

          if (!user) {
            console.error("Supabase auth error: No user returned")
            return null
          }

          return {
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.full_name,
          }
        } catch (error) {
          console.error("Unexpected auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: NEXTAUTH_SECRET,
}
