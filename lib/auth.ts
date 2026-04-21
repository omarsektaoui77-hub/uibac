// @ts-nocheck - Supabase type inference issues with database schema
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getSupabase } from "./supabase"

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Temporarily skip Supabase to isolate NextAuth issue
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        // For now, return a mock user to test if NextAuth works
        return {
          id: "test-user-id",
          email: credentials.email,
          name: "Test User",
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
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
  secret: process.env.NEXTAUTH_SECRET,
}
