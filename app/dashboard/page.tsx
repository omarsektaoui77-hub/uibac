"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black text-white">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome, {session.user?.name}!</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          <p>Email: {session.user?.email}</p>
          <p>User ID: {session.user?.id}</p>
        </div>
      </div>
    </div>
  )
}
