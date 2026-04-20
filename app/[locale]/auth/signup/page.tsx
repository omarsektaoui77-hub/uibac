"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"

export default function SignUp() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname ? pathname.split("/")[1] : "fr"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await res.json()

      if (res.ok) {
        await signIn("credentials", {
          email,
          password,
          callbackUrl: `/${locale}/dashboard`,
        })
      } else {
        setError(data.error || "Signup failed")
      }
    } catch (err) {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl w-96">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Create UIbac Account
        </h1>

        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 mb-3 rounded-lg bg-white/20 text-white placeholder-white/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 mb-3 rounded-lg bg-white/20 text-white placeholder-white/50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            className="w-full p-3 mb-4 rounded-lg bg-white/20 text-white placeholder-white/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg mb-4 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-white/60 text-center mt-4 text-sm">
          Already have an account?{" "}
          <a href={`/${locale}/auth/signin`} className="text-blue-400">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
