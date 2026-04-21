// @ts-nocheck - Supabase type inference issues with database schema
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getSupabase } from "./supabase"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const supabase = getSupabase()
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email: credentials!.email,
          password: credentials!.password,
        })

        if (error || !user) {
          throw new Error(error?.message || "Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.full_name,
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
