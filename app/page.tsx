"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { useEffect, useState } from "react";

export default function Home() {
  const [xp, setXp] = useState(0);

  useEffect(() => {
    const loadXP = async () => {
      try {
        const ref = doc(db, "users", "omar");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setXp(snap.data().xp);
        }
      } catch (error) {
        console.error("Error loading XP:", error);
      }
    };
    loadXP();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#171035] to-[#120c2b] text-white pb-24 px-4 max-w-md mx-auto">

      {/* TOP */}
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center font-bold">
            BQ
          </div>
          <div>
            <p className="font-bold">BacFlow</p>
            <p className="text-xs text-gray-300">Morocco Mode</p>
          </div>
        </div>
        <span className="text-xs bg-white/10 px-3 py-1 rounded-full">SM / PC / SVT</span>
      </div>

      {/* HERO */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-5 shadow-xl">
        <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-yellow-300 font-bold">
          Yallah Start 🔥
        </span>

        <h1 className="text-2xl font-bold mt-3 leading-tight">
          Play fast. Win XP.
        </h1>
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
          <p className="font-bold text-lg text-white">⭐ {xp} XP</p>
        </div>
        <p className="text-sm text-gray-300 mt-2">
          No reading. Just action.
        </p>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 p-3 rounded-xl">
            <p className="font-bold text-lg">🔥 5</p>
            <span className="text-xs text-gray-300">Day Streak</span>
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <p className="font-bold text-lg">🏆 Top 18%</p>
            <span className="text-xs text-gray-300">Rank</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2 mt-4">
          <Link href="/quiz?category=math">
            <motion.button className="w-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 py-3 rounded-full font-bold">
              ▶ Play 2-Min Challenge
            </motion.button>
          </Link>

          <motion.button className="bg-blue-500 py-3 rounded-full font-bold">
            ⚔️ Join Live Battle
          </motion.button>
        </div>
      </div>

      {/* MISSIONS */}
      <div className="mt-5 bg-white/10 rounded-3xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">🎯 Missions</h2>
          <span className="text-xs text-yellow-300">
            ⏳ Next in 03:12:44
          </span>
        </div>

        {[
          { title: "⚡ Quick Math", xp: 80, time: "2 min", cat: "math" },
          { title: "🧠 Physics Recall", xp: 120, time: "3 min", cat: "physics" },
          { title: "🔥 Boss Challenge", xp: 300, time: "5 min", cat: "boss" },
        ].map((m, i) => (
          <div key={i} className="bg-white/10 p-3 rounded-xl mb-3">
            <p className="font-bold">{m.title}</p>
            <p className="text-xs text-gray-300">
              ⏱ {m.time} • 🎁 +{m.xp} XP
            </p>

            <Link href={`/quiz?category=${m.cat}`}>
              <motion.button className="mt-2 w-full bg-pink-500 hover:bg-pink-400 py-2 rounded-lg font-bold transition-colors">
                Play Now ⚡
              </motion.button>
            </Link>
          </div>
        ))}
      </div>

      {/* BATTLE */}
      <div className="mt-5 bg-white/10 rounded-3xl p-4">
        <h2 className="font-bold mb-3">⚔️ Live Battles 🔥</h2>

        <motion.button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 py-3 rounded-xl font-bold mb-2">
          Join Random Match
        </motion.button>

        <motion.button className="w-full bg-purple-500 py-3 rounded-xl font-bold mb-2">
          Enter PIN
        </motion.button>

        <motion.button className="w-full bg-blue-500 py-3 rounded-xl font-bold">
          Challenge Friend
        </motion.button>

        <p className="text-center text-green-300 mt-2 text-sm">
          🔥 1,240 players online
        </p>
      </div>

      {/* PRACTICE */}
      <div className="mt-5 bg-white/10 rounded-3xl p-4">
        <h2 className="font-bold mb-3">🧠 Practice</h2>

        {[
          { name: "Math Derivatives", cat: "math" },
          { name: "Physics Formulas", cat: "physics" },
          { name: "Chemistry", cat: "chemistry" }
        ].map((p, i) => (
          <div key={i} className="bg-white/10 p-3 rounded-xl mb-2 flex justify-between items-center">
            <span>{p.name}</span>
            <Link href={`/quiz?category=${p.cat}`}>
              <motion.button className="text-sm bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full font-medium transition-colors">
                Resume
              </motion.button>
            </Link>
          </div>
        ))}
      </div>

      {/* PROFILE */}
      <div className="mt-5 bg-white/10 rounded-3xl p-4">
        <h2 className="font-bold mb-3">👤 Profile</h2>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold">Omar</p>
            <p className="text-sm text-gray-300">Challenger</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-xl flex items-center justify-center font-bold">
            OM
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 p-2 rounded text-center">
            🔥 7
          </div>
          <div className="bg-white/10 p-2 rounded text-center">
            ⭐ 3420
          </div>
          <div className="bg-white/10 p-2 rounded text-center">
            👑 Elite
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="fixed bottom-3 left-3 right-3 bg-[#1a133f] rounded-2xl flex justify-between p-2 text-xs">
        {["🏠", "🎯", "⚔️", "🧠", "👤"].map((icon, i) => (
          <div key={i} className="flex flex-col items-center flex-1 py-2 bg-white/5 rounded-xl">
            {icon}
          </div>
        ))}
      </div>

    </main>
  );
}