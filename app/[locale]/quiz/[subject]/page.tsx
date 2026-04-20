"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import QuizBattle from "@/app/components/QuizBattle";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [quizCompleted, setQuizCompleted] = useState(false);

  const locale = params.locale as string;
  const subject = params.subject as string;

  // Subject names in each locale
  const subjectNames: Record<string, Record<string, string>> = {
    fr: { mathematics: "Mathématiques", physics: "Physique", chemistry: "Chimie" },
    en: { mathematics: "Mathematics", physics: "Physics", chemistry: "Chemistry" },
    ar: { mathematics: "الرياضيات", physics: "الفيزياء", chemistry: "الكيمياء" },
    es: { mathematics: "Matemáticas", physics: "Física", chemistry: "Química" },
  };

  const subjectName = subjectNames[locale]?.[subject] || subject;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/auth/signin`);
    }
  }, [status, router, locale]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  const handleQuizComplete = async (score: number, answers: any[]) => {
    // Save quiz attempt to database
    try {
      await fetch("/api/quiz/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          score,
          answers,
          totalQuestions: answers.length,
        }),
      });
    } catch (error) {
      console.error("Failed to save attempt:", error);
    }
    
    setQuizCompleted(true);
    
    setTimeout(() => {
      router.push(`/${locale}/dashboard`);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black py-8">
      <div className="container mx-auto px-4">
        {!quizCompleted ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {subjectName} Battle
              </h1>
              <p className="text-white/70">
                {locale === "fr" && "Répondez rapidement pour gagner plus de points!"}
                {locale === "en" && "Answer quickly to earn more points!"}
                {locale === "ar" && "أجب بسرعة لكسب المزيد من النقاط!"}
                {locale === "es" && "¡Responde rápidamente para ganar más puntos!"}
              </p>
            </div>
            <QuizBattle
              subject={subject}
              locale={locale}
              onComplete={handleQuizComplete}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-white text-2xl mb-4">🎉 Quiz Complete! 🎉</div>
            <div className="text-white/70">Redirecting to dashboard...</div>
          </div>
        )}
      </div>
    </div>
  );
}
