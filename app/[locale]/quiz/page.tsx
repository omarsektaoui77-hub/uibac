"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getUserXP, saveUserXP } from "../../actions";
import { useEffect, useReducer, useRef, useState } from "react";
import { selectQuestions } from "../../lib/questions";
import { useLocale, useTranslations } from "next-intl";

const initialState = {
  status: "loading" as "loading" | "question" | "answered" | "result",
  index: 0,
  xp: 0,
  correctAnswers: 0,
  timeLeft: 10,
  questions: [] as any[],
  topicStats: {} as Record<string, { correct: number; total: number }>,
  showPop: false,
  streak: 2,
  lastPlayedDate: null as string | null,
  streakFreeze: 1,
  level: "Beginner" as "Beginner" | "Intermediate" | "Advanced" | "Master",
  reward: null as { type: string; value?: any } | null,
  streakMultiplier: 1,
  // Engagement tracking
  sessionCount: 0,
  quizzesCompleted: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  engagementScore: 0.5,
  atRisk: false,
};

function handleAnswer(state: typeof initialState, selected: string | null) {
  const current = state.questions[state.index];
  const isCorrect =
    selected === current.correct_answer ||
    selected === current.correct;

  const topic = current.topic || "General";

  const updatedStats = {
    ...state.topicStats,
    [topic]: {
      correct:
        (state.topicStats[topic]?.correct || 0) +
        (isCorrect ? 1 : 0),
      total: (state.topicStats[topic]?.total || 0) + 1,
    },
  };

  return {
    ...state,
    status: "answered" as const,
    xp: isCorrect ? state.xp + (current.xp || 10) : state.xp,
    correctAnswers: isCorrect
      ? state.correctAnswers + 1
      : state.correctAnswers,
    topicStats: updatedStats,
    showPop: isCorrect,
  };
}

function updateStreak(state: typeof initialState) {
  const today = new Date().toDateString();

  if (state.lastPlayedDate === today) return state;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (state.lastPlayedDate === yesterday.toDateString()) {
    return {
      ...state,
      streak: state.streak + 1,
      lastPlayedDate: today,
      streakMultiplier: getStreakMultiplier(state.streak + 1),
    };
  }

  // Missed day - check streak freeze
  if (state.streakFreeze > 0) {
    return {
      ...state,
      streakFreeze: state.streakFreeze - 1,
      lastPlayedDate: today,
    };
  }

  return {
    ...state,
    streak: 1,
    lastPlayedDate: today,
    streakMultiplier: 1,
  };
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 15) return 2;
  if (streak >= 8) return 1.5;
  if (streak >= 4) return 1.2;
  return 1;
}

function getVariableReward() {
  const rand = Math.random();

  if (rand < 0.5) return { type: "xp", value: 10 };
  if (rand < 0.75) return { type: "xp_boost", value: 20 };
  if (rand < 0.9) return { type: "streak_freeze", value: 1 };
  return { type: "rare_insight", value: "Your consistency is building neural pathways!" };
}

function getMysteryReward(streak: number) {
  if (streak % 5 !== 0) return null;

  const rand = Math.random();

  if (rand < 0.4) return { type: "rare_xp", value: 50 };
  if (rand < 0.7) return { type: "theme_unlock", value: "Neon Mode" };
  if (rand < 0.9) return { type: "strategy_tip", value: "Focus on weak areas for maximum growth" };
  return { type: "streak_freeze_token", value: 2 };
}

function getLevel(accuracy: number): "Beginner" | "Intermediate" | "Advanced" | "Master" {
  if (accuracy > 0.85) return "Master";
  if (accuracy > 0.7) return "Advanced";
  if (accuracy > 0.5) return "Intermediate";
  return "Beginner";
}

function generateCoachFeedback(
  topicStats: Record<string, { correct: number; total: number }>,
  engagementScore: number,
  isHighPerformer: boolean
): { strength: string; weakness: string; tip: string } {
  const topics = Object.entries(topicStats);
  
  if (topics.length === 0) {
    return {
      strength: "Ready to learn",
      weakness: "Not enough data yet",
      tip: "Complete more quizzes for insights",
    };
  }

  const sortedByAccuracy = topics.sort((a, b) => {
    const aAcc = a[1].correct / a[1].total;
    const bAcc = b[1].correct / b[1].total;
    return bAcc - aAcc;
  });

  const strongest = sortedByAccuracy[0];
  const weakest = sortedByAccuracy[sortedByAccuracy.length - 1];

  // Personalize tone based on performance and engagement
  if (isHighPerformer && engagementScore > 0.7) {
    return {
      strength: `Mastering ${strongest[0]} patterns`,
      weakness: `Push ${weakest[0]} to next level`,
      tip: `Challenge yourself with advanced ${weakest[0]} problems`,
    };
  }

  if (engagementScore < 0.5) {
    return {
      strength: `Building ${strongest[0]} skills`,
      weakness: `${weakest[0]} needs focus`,
      tip: `Start with easy ${weakest[0]} to build confidence`,
    };
  }

  return {
    strength: `Strong in ${strongest[0]} patterns`,
    weakness: `Work on ${weakest[0]} fundamentals`,
    tip: `Practice ${weakest[0]} daily for improvement`,
  };
}

function calculateEngagementScore(state: typeof initialState): number {
  const sessionScore = Math.min(state.sessionCount / 10, 1) * 0.25;
  const completionScore = state.quizzesCompleted > 0 ? Math.min(state.quizzesCompleted / 5, 1) * 0.25 : 0;
  const streakScore = Math.min(state.streak / 7, 1) * 0.15;
  const responseScore = state.averageResponseTime > 0 ? Math.max(0, 1 - (state.averageResponseTime / 30)) * 0.15 : 0.1;
  
  // Accuracy and consistency (user-suggested)
  const totalQuestions = state.questions.length > 0 ? state.questions.length : 1;
  const accuracy = state.correctAnswers / totalQuestions || 0;
  const consistency = Math.min(state.streak / 7, 1);
  const accuracyConsistencyScore = (accuracy * 0.6) + (consistency * 0.4);

  return sessionScore + completionScore + streakScore + responseScore + accuracyConsistencyScore;
}

function predictChurnRisk(state: typeof initialState): boolean {
  const engagementScore = calculateEngagementScore(state);
  
  // At risk if: engagement dropping + streak broken recently
  const streakBrokenRecently = state.lastPlayedDate && 
    new Date(state.lastPlayedDate) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  
  return engagementScore < 0.4 && streakBrokenRecently === true;
}

function getDynamicReward(state: typeof initialState) {
  const engagementScore = calculateEngagementScore(state);
  const atRisk = predictChurnRisk(state);

  // If engagement drops, increase reward frequency
  if (atRisk || engagementScore < 0.4) {
    const rand = Math.random();
    if (rand < 0.4) return { type: "xp", value: 20 }; // Higher XP
    if (rand < 0.7) return { type: "xp_boost", value: 30 }; // Bigger boost
    if (rand < 0.9) return { type: "streak_freeze", value: 2 }; // Extra freeze
    return { type: "rare_insight", value: "You're making great progress!" };
  }

  // If engagement high, reduce rewards slightly
  if (engagementScore > 0.7) {
    const rand = Math.random();
    if (rand < 0.6) return { type: "xp", value: 5 };
    if (rand < 0.8) return { type: "xp_boost", value: 10 };
    return { type: "rare_insight", value: "Keep up the momentum!" };
  }

  // Default rewards
  const rand = Math.random();
  if (rand < 0.5) return { type: "xp", value: 10 };
  if (rand < 0.75) return { type: "xp_boost", value: 20 };
  if (rand < 0.9) return { type: "streak_freeze", value: 1 };
  return { type: "rare_insight", value: "Your consistency is building neural pathways!" };
}

function getAdaptiveDifficulty2_0(
  state: typeof initialState,
  topic: string
): number {
  const topicStats = state.topicStats[topic as keyof typeof state.topicStats];
  const engagementScore = calculateEngagementScore(state);

  if (!topicStats || topicStats.total === 0) return 10;

  const accuracy = topicStats.correct / topicStats.total;
  const speedBonus = state.averageResponseTime > 0 ? (state.averageResponseTime < 5 ? -2 : 0) : 0;
  const engagementBonus = engagementScore > 0.7 ? -1 : 0;

  let adaptiveTime = 10;

  if (accuracy < 0.5) adaptiveTime = 15 + engagementBonus; // weak → more time
  else if (accuracy > 0.8) adaptiveTime = Math.max(5, 8 + speedBonus); // strong → less time
  else adaptiveTime = 10 + speedBonus;

  return Math.max(5, adaptiveTime);
}

function getSmartStreakPressure(state: typeof initialState): {
  freezeCount: number;
  penaltySoftness: number;
} {
  const engagementScore = calculateEngagementScore(state);
  
  if (engagementScore > 0.7) {
    // High performer - increase pressure
    return { freezeCount: 0, penaltySoftness: 1 };
  }

  if (engagementScore < 0.4) {
    // Struggling - soften penalty
    return { freezeCount: 2, penaltySoftness: 0.5 };
  }

  // Normal - balanced
  return { freezeCount: 1, penaltySoftness: 1 };
}

function reducer(state: typeof initialState, action: any) {
  switch (action.type) {
    case "SET_QUESTIONS":
      return {
        ...state,
        questions: action.payload,
        status: "question" as const,
        timeLeft: action.payload[0]?.time_estimate || 10,
      };

    case "SET_XP":
      return {
        ...state,
        xp: action.payload,
      };

    case "UPDATE_STREAK":
      return updateStreak(state);

    case "COMPLETE_QUIZ":
      const updatedState = updateStreak(state);
      const dynamicReward = getDynamicReward(updatedState);
      const mysteryReward = getMysteryReward(updatedState.streak);
      const accuracy = updatedState.correctAnswers / updatedState.questions.length;
      const level = getLevel(accuracy);
      const engagementScore = calculateEngagementScore(updatedState);
      const atRisk = predictChurnRisk(updatedState);
      const streakPressure = getSmartStreakPressure(updatedState);

      let newXp = updatedState.xp;
      if (dynamicReward.type === "xp" || dynamicReward.type === "xp_boost") {
        newXp = newXp + ((dynamicReward.value as number) * updatedState.streakMultiplier);
      }
      if (mysteryReward && mysteryReward.type === "rare_xp") {
        newXp = newXp + (mysteryReward.value as number);
      }

      return {
        ...updatedState,
        xp: newXp,
        level,
        reward: mysteryReward || dynamicReward,
        streakMultiplier: getStreakMultiplier(updatedState.streak),
        sessionCount: updatedState.sessionCount + 1,
        quizzesCompleted: updatedState.quizzesCompleted + 1,
        engagementScore,
        atRisk,
        streakFreeze: streakPressure.freezeCount,
      };

    case "TICK":
      if (state.status !== "question") return state;

      if (state.timeLeft <= 1) {
        return handleAnswer(state, null);
      }

      return {
        ...state,
        timeLeft: state.timeLeft - 1,
      };

    case "TIME_UP":
      if (state.status !== "question") return state;
      return handleAnswer(state, null);

    case "ANSWER":
      if (state.status !== "question") return state;
      return handleAnswer(state, action.payload);

    case "NEXT":
      const nextIndex = state.index + 1;

      if (nextIndex >= state.questions.length) {
        return { ...state, status: "result" as const };
      }

      const nextQuestion = state.questions[nextIndex];
      const topic = nextQuestion?.topic || 'General';
      
      // Use adaptive difficulty 2.0
      const adaptiveTime = getAdaptiveDifficulty2_0(state, topic);

      return {
        ...state,
        index: nextIndex,
        status: "question" as const,
        timeLeft: adaptiveTime,
        showPop: false,
      };

    case "RESET":
      return {
        ...initialState,
        questions: state.questions,
        status: "question" as const,
        streak: state.streak,
        lastPlayedDate: state.lastPlayedDate,
        streakFreeze: state.streakFreeze,
        level: state.level,
        streakMultiplier: state.streakMultiplier,
        topicStats: state.topicStats,
        xp: state.xp,
        sessionCount: state.sessionCount,
        quizzesCompleted: state.quizzesCompleted,
        totalResponseTime: state.totalResponseTime,
        averageResponseTime: state.averageResponseTime,
        engagementScore: state.engagementScore,
        atRisk: state.atRisk,
      };

    default:
      return state;
  }
}

export default function QuizPage() {
  const locale = useLocale();
  const t = useTranslations("Quiz");
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loadingDb, setLoadingDb] = useState(true);
  const [error, setError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveXpRef = useRef<AbortController | null>(null);
  const engineRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const params = new URLSearchParams(window.location.search);
      const trackId = params.get("trackId") || "common";
      const subjectId = params.get("subjectId") || "advanced_math";
      const difficulty = params.get("difficulty");
      const language = locale || 'en';

      try {
        // Fetch questions from the optimized API
        const response = await fetch(`/api/questions/practice?trackId=${trackId}&subjectId=${subjectId}&difficulty=${difficulty || ''}&count=5&language=${language}`, {
          signal: controller.signal
        });
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

          dispatch({ type: "SET_QUESTIONS", payload: formattedQuestions });
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
            dispatch({ type: "SET_QUESTIONS", payload: fallbackQuestions.slice(0, 5) });
          }
        }

        setLoadingDb(false);
      } catch (error) {
        if (controller.signal.aborted) {
          console.log("Fetch aborted, component unmounted or new request initiated");
          return;
        }
        console.error("Error fetching questions:", error);
        // Fallback to static questions
        const fallbackQuestions = selectQuestions("math");
        dispatch({ type: "SET_QUESTIONS", payload: fallbackQuestions.slice(0, 5) });
        setLoadingDb(false);
      }
    };
    fetchQuestions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [locale]);

  useEffect(() => {
    const loadXP = async () => {
      try {
        const xp = await getUserXP("Sektaoui");
        dispatch({ type: "SET_XP", payload: xp });
      } catch (error) {
        console.error("Error loading XP:", error);
      }
    };
    loadXP();
  }, []);

  const current = state.questions[state.index];

  const saveXP = async (newXp: number) => {
    try {
      await saveUserXP("omar", newXp, "Omar");
      console.log("XP saved successfully!");
    } catch (error) {
      console.error("Error saving XP:", error);
    }
  };

  // Engine loop - centralized time control
  useEffect(() => {
    if (state.status !== "question") {
      if (engineRef.current) {
        clearInterval(engineRef.current);
        engineRef.current = null;
        console.log("[ENGINE STOP]");
      }
      return;
    }

    if (engineRef.current) return;

    console.log("[ENGINE START]");

    engineRef.current = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);

    return () => {
      if (engineRef.current) {
        clearInterval(engineRef.current);
        engineRef.current = null;
      }
    };
  }, [state.status]);

  // Auto-advance to next question after answer
  useEffect(() => {
    if (state.status === "answered") {
      const timeout = setTimeout(() => {
        dispatch({ type: "NEXT" });
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [state.status]);

  // Transition logger for debugging
  useEffect(() => {
    console.log("[STATE]", state.status, "Index:", state.index, "TimeLeft:", state.timeLeft);
  }, [state.status, state.index, state.timeLeft]);

  // Effects handler - isolates side effects from reducer
  useEffect(() => {
    const handleEffects = async () => {
      switch (state.status) {
        case "result":
          console.log("[EFFECT] Quiz completed, saving XP:", state.xp);
          localStorage.setItem("xp", String(state.xp));
          
          // Dispatch COMPLETE_QUIZ to trigger gamification rewards
          dispatch({ type: "COMPLETE_QUIZ" });
          
          // Cancel previous saveXP if exists
          if (saveXpRef.current) {
            saveXpRef.current.abort();
          }
          
          const controller = new AbortController();
          saveXpRef.current = controller;
          
          try {
            await saveXP(state.xp);
          } catch (error) {
            if (controller.signal.aborted) {
              console.log("Save XP aborted");
              return;
            }
            console.error("Error saving XP:", error);
          }
          break;
        case "answered":
          console.log("[EFFECT] Answer processed, transitioning to next");
          break;
        default:
          break;
      }
    };

    handleEffects();

    return () => {
      if (saveXpRef.current) {
        saveXpRef.current.abort();
      }
    };
  }, [state.status, state.xp]);

  if (state.status === "result") {
    const accuracy = Math.round((state.correctAnswers / state.questions.length) * 100);
    const totalXpEarned = state.questions.slice(0, state.index + 1).reduce((sum, q, i) => {
      return i < state.correctAnswers ? sum + (q.xp || 10) : sum;
    }, 0);

    // Calculate topic accuracies
    const topicAccuracies = Object.entries(state.topicStats).map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      correct: stats.correct,
      total: stats.total
    }));

    // Find weakest topic
    const weakestTopic = topicAccuracies.length > 0 
      ? topicAccuracies.reduce((min, curr) => curr.accuracy < min.accuracy ? curr : min)
      : null;

    // Generate AI coach feedback with personalization
    const isHighPerformer = state.level === "Master" || state.level === "Advanced";
    const coachFeedback = generateCoachFeedback(state.topicStats, state.engagementScore, isHighPerformer);

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
              <p className="text-xs text-green-400 mt-1">{t("summary.correct", { count: state.correctAnswers })}</p>
            </motion.div>

            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.6, type: "spring" }}
              className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 flex flex-col items-center justify-center"
            >
              <p className="text-sm text-gray-400 mb-1">{t("summary.xp_earned")}</p>
              <p className="text-3xl font-bold text-yellow-400">+{totalXpEarned}</p>
              <p className="text-xs text-gray-400 mt-1">{t("summary.total")}: {state.xp}</p>
            </motion.div>
          </div>

          {/* Streak and Multiplier */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4 mb-8"
          >
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.7, type: "spring" }}
              className="bg-gradient-to-br from-orange-500/20 to-red-500/20 p-4 rounded-2xl border border-orange-500/30 flex flex-col items-center justify-center"
            >
              <p className="text-sm text-orange-300 mb-1">🔥 Streak</p>
              <p className="text-3xl font-bold text-white">{state.streak} days</p>
              {state.streakFreeze > 0 && (
                <p className="text-xs text-blue-400 mt-1">❄️ {state.streakFreeze} freeze</p>
              )}
            </motion.div>

            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.8, type: "spring" }}
              className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4 rounded-2xl border border-purple-500/30 flex flex-col items-center justify-center"
            >
              <p className="text-sm text-purple-300 mb-1">⚡ Multiplier</p>
              <p className="text-3xl font-bold text-white">x{state.streakMultiplier}</p>
              <p className="text-xs text-gray-400 mt-1">{state.level}</p>
            </motion.div>
          </motion.div>

          {/* Reward Display */}
          {state.reward && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: "spring" }}
              className="mb-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-2xl border border-yellow-500/30"
            >
              <p className="text-sm text-yellow-300 mb-1">🎁 Reward</p>
              <p className="text-lg font-bold text-white">
                {state.reward.type === "xp" && `+${state.reward.value} XP`}
                {state.reward.type === "xp_boost" && `+${state.reward.value} XP Boost`}
                {state.reward.type === "streak_freeze" && "❄️ Streak Freeze"}
                {state.reward.type === "rare_insight" && state.reward.value}
                {state.reward.type === "rare_xp" && `💎 +${state.reward.value} Rare XP`}
                {state.reward.type === "theme_unlock" && `🎨 ${state.reward.value}`}
                {state.reward.type === "strategy_tip" && `💡 ${state.reward.value}`}
                {state.reward.type === "streak_freeze_token" && `❄️ ${state.reward.value}x Freeze Token`}
              </p>
            </motion.div>
          )}

          {/* Topic Performance */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <p className="text-sm text-gray-400 mb-3 text-left">Topic Performance</p>
            <div className="space-y-2">
              {topicAccuracies.map((item, idx) => (
                <motion.div
                  key={item.topic}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  className={`bg-gray-800/50 p-3 rounded-xl border ${
                    weakestTopic && item.topic === weakestTopic.topic
                      ? 'border-red-500/50 bg-red-500/10'
                      : 'border-gray-700'
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.topic}</span>
                    {weakestTopic && item.topic === weakestTopic.topic && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Weak</span>
                    )}
                  </div>
                  <span className="text-sm font-bold">{item.accuracy}%</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI Coach Feedback */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="mb-8 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 rounded-2xl border border-blue-500/30"
          >
            <p className="text-sm text-blue-300 mb-3 text-left">🧠 AI Coach</p>
            <div className="space-y-2 text-left">
              <div className="flex items-start gap-2">
                <span className="text-green-400 text-xs mt-1">✓</span>
                <p className="text-sm text-white">{coachFeedback.strength}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-xs mt-1">!</span>
                <p className="text-sm text-white">{coachFeedback.weakness}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 text-xs mt-1">💡</span>
                <p className="text-sm text-white">{coachFeedback.tip}</p>
              </div>
            </div>
          </motion.div>

          {/* Engagement Score */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className={`mb-8 p-4 rounded-2xl border ${
              state.atRisk 
                ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30' 
                : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-300">Engagement Score</p>
              <p className="text-lg font-bold text-white">{Math.round(state.engagementScore * 100)}%</p>
            </div>
            {state.atRisk && (
              <p className="text-xs text-red-400">⚠️ We noticed you're less active - we've adjusted rewards to help you stay on track!</p>
            )}
            {!state.atRisk && state.engagementScore > 0.7 && (
              <p className="text-xs text-green-400">🎯 Great engagement! We've increased the challenge for you.</p>
            )}
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.8 }}
            className="flex flex-col gap-3"
          >
            <button 
              onClick={() => {
                dispatch({ type: "RESET" });
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

  if (loadingDb || state.status === "loading" || !current) {
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
      animate={state.timeLeft <= 3 ? { backgroundColor: ["#000000", "#330000", "#000000"] } : { backgroundColor: "#000000" }}
      transition={{ duration: 0.6, repeat: Infinity }}
    >
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
        <p className="font-bold text-lg text-white">⭐ {state.xp} XP</p>
        <AnimatePresence>
          {state.showPop && (
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
            {t("question_counter", { current: state.index + 1, total: state.questions.length })}
          </p>
          <motion.p 
            className={`font-bold ${state.timeLeft <= 3 ? "text-red-500" : "text-gray-400"}`}
            animate={state.timeLeft <= 3 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            00:{state.timeLeft < 10 ? `0${state.timeLeft}` : state.timeLeft}
          </motion.p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${state.timeLeft <= 3 ? "bg-red-500" : "bg-gradient-to-r from-yellow-400 to-pink-500"}`}
            initial={{ width: "100%" }}
            animate={{ width: `${(state.timeLeft / 10) * 100}%` }}
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
            onClick={() => dispatch({ type: "ANSWER", payload: o })}
            className="w-full bg-gray-800 py-4 rounded-xl font-medium text-lg"
          >
            {o}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}