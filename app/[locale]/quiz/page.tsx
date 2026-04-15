"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getUserXP, saveUserXP } from "../../actions";
import { useEffect, useState } from "react";
import { selectQuestions } from "../../lib/questions";
import { useLocale, useTranslations } from "next-intl";

export default function QuizPage() {
  const locale = useLocale();
  const t = useTranslations("Quiz");
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);
  const [showPop, setShowPop] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get("trackId") || "common";
      const subjectId = params.get("subjectId") || "advanced_math";
      const difficulty = params.get("difficulty");
      const language = locale || 'en';

      try {
        // Fetch questions from the optimized API
        const response = await fetch(`/api/questions/practice?trackId=${trackId}&subjectId=${subjectId}&difficulty=${difficulty || ''}&count=5&language=${language}`);
        const data = await response.json();

        if (response.ok && data.success && data.questions.length > 0) {
          // Convert questions to the format expected by the quiz component
          const formattedQuestions = data.questions.map((q: any) => ({
            question: q.question,
            options: q.choices,
            correct_answer: q.answer,
            correct: q.answer,
            topic: q.concept || 'General',
            time_estimate: Math.max(10, Math.floor(q.xp / 2)), // Estimate time based on XP
            xp: q.xp,
            difficulty: q.difficulty
          }));

          setQuestions(formattedQuestions);
        } else {
          // Check if pipeline needs to be triggered
          if (data.needsProcessing) {
            console.log("Question bank not found, triggering pipeline...");
            // Trigger pipeline in background
            fetch(`/api/pipeline/trigger`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trackId, subjectId, language })
            }).catch(console.error);
            
            // Show message to user
            setError("Generating questions... Please refresh in a few minutes.");
          } else {
            // Fallback to static questions if API fails or no data
            console.log("No questions from API, falling back to static data");
            const fallbackQuestions = selectQuestions("math");
            setQuestions(fallbackQuestions.slice(0, 5));
          }
        }

        setLoadingDb(false);
      } catch (error) {
        console.error("Error fetching questions:", error);
        // Fallback to static questions
        const fallbackQuestions = selectQuestions("math");
        setQuestions(fallbackQuestions.slice(0, 5));
        setLoadingDb(false);
      }
    };
    fetchQuestions();
  }, [locale]);

  useEffect(() => {
    const loadXP = async () => {
      try {
        const xp = await getUserXP("Sektaoui");
        setXp(xp);
      } catch (error) {
        console.error("Error loading XP:", error);
      }
    };
    loadXP();
  }, []);

  const current = questions[index];

  useEffect(() => {
    if (current && !done) {
      setTimeLeft(current.time_estimate || 15);
    }
  }, [index, current, done]);

  useEffect(() => {
    if (done || !current || loadingDb) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [index, done, current, loadingDb]);

  useEffect(() => {
    if (timeLeft === 0 && !done && current && !loadingDb) {
      answer(""); // Auto fail when time is up
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, done, current, loadingDb]);

  const saveXP = async (newXp: number) => {
    try {
      await saveUserXP("omar", newXp, "Omar");
      console.log("XP saved successfully!");
    } catch (error) {
      console.error("Error saving XP:", error);
    }
  };

  const answer = (opt: string) => {
    let newXp = xp;
    const questionXP = current.xp || 10;

    if (opt === current.correct_answer || opt === current.correct) {
      newXp = xp + questionXP;
      setXp(newXp);
      setCorrectAnswers((prev) => prev + 1);
      setShowPop(true);
      setTimeout(() => setShowPop(false), 500);
    }

    if (index + 1 < questions.length) {
      setIndex(index + 1);
      // Timer relies on the standard useEffect watching `index` to reset it.
    } else {
      setDone(true);
      localStorage.setItem("xp", String(newXp));
      saveXP(newXp);
    }
  };

  if (done) {
    const accuracy = Math.round((correctAnswers / questions.length) * 100);
    const totalXpEarned = questions.slice(0, index + 1).reduce((sum, q, i) => {
      return i < correctAnswers ? sum + (q.xp || 10) : sum;
    }, 0);
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black text-white p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", bounce: 0.5 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl w-full max-w-md text-center shadow-2xl"
        >
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              {t("summary.title")}
            </h1>
            <p className="text-gray-400 mb-8">{t("summary.subtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.4, type: "spring" }}
              className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 flex flex-col items-center justify-center"
            >
              <p className="text-sm text-gray-400 mb-1">{t("summary.accuracy")}</p>
              <p className="text-3xl font-bold text-white">{accuracy}%</p>
              <p className="text-xs text-green-400 mt-1">{t("summary.correct", { count: correctAnswers })}</p>
            </motion.div>

            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.6, type: "spring" }}
              className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 flex flex-col items-center justify-center"
            >
              <p className="text-sm text-gray-400 mb-1">{t("summary.xp_earned")}</p>
              <p className="text-3xl font-bold text-yellow-400">+{totalXpEarned}</p>
              <p className="text-xs text-gray-400 mt-1">{t("summary.total")}: {xp}</p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.8 }}
            className="flex flex-col gap-3"
          >
            <button 
              onClick={() => {
                setIndex(0);
                setDone(false);
                setTimeLeft(10);
                setCorrectAnswers(0);
              }}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 py-4 rounded-xl font-bold text-lg transition-all"
            >
              {t("summary.play_again")}
            </button>
            <Link href={`/${locale}`} className="w-full">
              <button className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold text-lg transition-all">
                {t("summary.back")}
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (loadingDb || !current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="animate-pulse mb-4">{t("loading")}</p>
          {error && (
            <p className="text-yellow-400 text-sm max-w-md">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center items-center bg-black text-white p-6 relative overflow-hidden"
      animate={timeLeft <= 3 ? { backgroundColor: ["#000000", "#330000", "#000000"] } : { backgroundColor: "#000000" }}
      transition={{ duration: 0.6, repeat: Infinity }}
    >
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
        <p className="font-bold text-lg text-white">⭐ {xp} XP</p>
        <AnimatePresence>
          {showPop && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-green-400 font-bold absolute -bottom-6 right-0"
            >
              +{current.xp || 10} XP
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-sm mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-400">
            {t("question_counter", { current: index + 1, total: questions.length })}
          </p>
          <motion.p 
            className={`font-bold ${timeLeft <= 3 ? "text-red-500" : "text-gray-400"}`}
            animate={timeLeft <= 3 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </motion.p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${timeLeft <= 3 ? "bg-red-500" : "bg-gradient-to-r from-yellow-400 to-pink-500"}`}
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / 10) * 100}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2 text-center max-w-sm">
        {current.question || current.q}
      </h2>
      <p className="text-gray-400 text-sm mb-6 text-center">{current.topic}</p>

      <div className="w-full max-w-md space-y-4">
        {current.options.map((o: string) => (
          <motion.button
            key={o}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => answer(o)}
            className="w-full bg-gray-800 py-4 rounded-xl font-medium text-lg"
          >
            {o}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
