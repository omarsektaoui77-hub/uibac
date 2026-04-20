"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const subjects = [
  { key: "mathematics", name: "Matemáticas", icon: "📐", color: "bg-blue-600" },
  { key: "physics", name: "Física", icon: "⚡", color: "bg-green-600" },
  { key: "chemistry", name: "Química", icon: "🧪", color: "bg-purple-600" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = "es";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/auth/signin`);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black text-white">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">¡Bienvenido de nuevo, {session.user?.name}!</h1>
            <p className="text-white/60 mt-2">¿Listo para entrenar para tu Bachillerato?</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">📅 Desafío Diario</h2>
            <p className="text-white/70 mb-4">Completa el quiz de hoy para ganar puntos extra</p>
            <button className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Comenzar desafío →
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">📊 Tus Estadísticas</h2>
            <div className="space-y-2 text-white/70">
              <p>📧 Email: {session.user?.email}</p>
              <p>🏆 Puntuación Total: 0</p>
              <p>📈 Clasificación Semanal: No clasificado</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 col-span-full">
            <h2 className="text-xl font-semibold mb-4">⚔️ Comenzar una Batalla</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subjects.map((subj) => (
                <button
                  key={subj.key}
                  onClick={() => router.push(`/${locale}/quiz/${subj.key}`)}
                  className={`${subj.color} p-6 rounded-xl text-center hover:opacity-90 transition`}
                >
                  <div className="text-4xl mb-2">{subj.icon}</div>
                  <div className="text-white font-semibold">{subj.name}</div>
                  <div className="text-white/70 text-sm mt-1">Comenzar →</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">🎯 Áreas de Enfoque</h2>
            <p className="text-white/70">Completa tu primer quiz para ver tus puntos débiles</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">🏅 Clasificación</h2>
            <p className="text-white/70">Compite con amigos para subir en la clasificación</p>
            <button className="mt-4 bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition">
              Ver clasificación →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
