"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const subjects = [
  { key: "mathematics", name: "Mathématiques", icon: "📐", color: "bg-blue-600" },
  { key: "physics", name: "Physique", icon: "⚡", color: "bg-green-600" },
  { key: "chemistry", name: "Chimie", icon: "🧪", color: "bg-purple-600" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = "fr";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/auth/signin`);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black text-white">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Bon retour, {session.user?.name}!</h1>
            <p className="text-white/60 mt-2">Prêt à t'entraîner pour ton Bac ?</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Se déconnecter
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Challenge Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">📅 Défi Quotidien</h2>
            <p className="text-white/70 mb-4">Termine le quiz d'aujourd'hui pour gagner des points bonus</p>
            <button className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Commencer le défi →
            </button>
          </div>

          {/* Stats Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">📊 Tes Statistiques</h2>
            <div className="space-y-2 text-white/70">
              <p>📧 Email: {session.user?.email}</p>
              <p>🏆 Score Total: 0</p>
              <p>📈 Classement Hebdo: Non classé</p>
            </div>
          </div>

          {/* Battle Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 col-span-full">
            <h2 className="text-xl font-semibold mb-4">⚔️ Commencer un Combat</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subjects.map((subj) => (
                <button
                  key={subj.key}
                  onClick={() => router.push(`/${locale}/quiz/${subj.key}`)}
                  className={`${subj.color} p-6 rounded-xl text-center hover:opacity-90 transition`}
                >
                  <div className="text-4xl mb-2">{subj.icon}</div>
                  <div className="text-white font-semibold">{subj.name}</div>
                  <div className="text-white/70 text-sm mt-1">Commencer →</div>
                </button>
              ))}
            </div>
          </div>

          {/* Weak Topics Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">🎯 Points à Travailler</h2>
            <p className="text-white/70">Complète ton premier quiz pour voir tes points faibles</p>
          </div>

          {/* Leaderboard Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">🏅 Classement</h2>
            <p className="text-white/70">Affronte tes amis pour monter dans le classement</p>
            <button className="mt-4 bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition">
              Voir le classement →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
