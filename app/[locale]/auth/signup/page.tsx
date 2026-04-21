"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

export default function SignUp() {
  const t = useTranslations("Auth.signup")
  const locale = useLocale()
  const router = useRouter()
  
  // Debug: Log locale from useLocale()
  console.log('[I18N DEBUG] Signup page - useLocale() returned:', locale);
  console.log('[I18N DEBUG] Signup page - Translation namespace:', "Auth.signup");
  console.log('[I18N DEBUG] Signup page - Sample translation t("title"):', t("title"));

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
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        })

        if (signInResult?.error) {
          setError(t("error_account_created_login_failed"))
          setLoading(false)
        } else if (signInResult?.ok) {
          router.push(`/${locale}/dashboard`)
        }
      } else {
        setError(data.error || t("error_signup_failed"))
        setLoading(false)
      }
    } catch (err) {
      setError(t("error_occurred"))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl w-96">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          {t("title")}
        </h1>

        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t("full_name")}
            className="w-full p-3 mb-3 rounded-lg bg-white/20 text-white placeholder-white/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder={t("email")}
            className="w-full p-3 mb-3 rounded-lg bg-white/20 text-white placeholder-white/50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t("password")}
            className="w-full p-3 mb-4 rounded-lg bg-white/20 text-white placeholder-white/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg mb-4 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t("creating") : t("sign_up")}
          </button>
        </form>

        <p className="text-white/60 text-center mt-4 text-sm">
          {t("already_have_account")}{" "}
          <Link href={`/${locale}/auth/signin`} className="text-blue-400">
            {t("sign_in")}
          </Link>
        </p>
      </div>
    </div>
  )
}
