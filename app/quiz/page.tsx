"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { useEffect, useState } from "react";


export default function QuizPage(...args: []) {
    const [index, setIndex] = useState(0);
    const [xp, setXp] = useState(0);
    const [done, setDone] = useState(false);

    const current = questions[index];
    const saveXP = async (xp: number) => {
        try {
            await setDoc(doc(db, "users", "omar"), {
                name: "Omar",
                xp: xp,
                lastUpdated: new Date().toISOString()
            });
            console.log("XP saved successfully!");
        } catch (error) {
            console.error("Error saving XP:", error);
        }
    };
    const answer = (opt: string) => {
        if (opt === current.correct) {
            setXp(xp + 10);
        }

        if (index + 1 < questions.length) {
            setIndex(index + 1);
        } else {
            const finalXP = xp + (xp > 0 ? 10 : 0);
            setDone(true);
            localStorage.setItem("xp", String(finalXP));
            saveXP(finalXP); // ← SAVE TO FIREBASE
        }
    };

    if (done) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white">
                <h1 className="text-3xl mb-4">🔥 +{xp} XP</h1>
                <motion.button
                    onClick={() => (window.location.href = "/")}
                    className="bg-yellow-400 text-black px-6 py-3 rounded-xl"
                >
                    Back Home
                </motion.button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white p-6">
            <p className="mb-2">
                Question {index + 1}/{questions.length}
            </p>
<div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
  <p className="font-bold text-lg text-white">⭐ {xp} XP</p>
</div><div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
  <p className="font-bold text-lg text-white">⭐ {xp} XP</p>
</div>
            <h2 className="text-xl font-bold mb-6 text-center">
                {current.q}
            </h2>

            <div className="w-full max-w-md space-y-3">
                {current.options.map((o) => (
                    <motion.button
                        key={o}
                        onClick={() => answer(o)}
                        className="w-full bg-gray-800 py-3 rounded-xl"
                    >
                        {o}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
import Link from "next/link";
<Link href="/quiz">
  <motion.button className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 py-3 rounded-full font-bold">
    ▶ Play 2-Min Challenge
  </motion.button>
</Link>
import { motion } from "framer-motion";
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1.2 }}
  className="text-green-400 font-bold"
>
  +10 XP
</motion.div>

const saveXP = async (xp: number) => {
  await setDoc(doc(db, "users", "omar"), {
    name: "Omar",
    xp: xp,
  });
};
saveXP(xp);
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