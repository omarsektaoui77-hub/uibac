"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  question: string;
  options: string[];
  topic: string;
  difficulty: string;
  points: number;
  timeLimit: number;
}

interface QuizBattleProps {
  subject: string;
  locale: string;
  onComplete: (score: number, answers: any[]) => void;
}

export default function QuizBattle({ subject, locale, onComplete }: QuizBattleProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(true);
  const [quizFinished, setQuizFinished] = useState(false);
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});

  // Fix hydration: only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load questions
  useEffect(() => {
    if (!mounted) return;
    
    fetch(`/api/quiz/questions?subject=${subject}&locale=${locale}&limit=5`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error("API Error:", data.error);
          setLoading(false);
          return;
        }
        
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          console.error("No questions received");
          setLoading(false);
          return;
        }
        
        setQuestions(data.questions);
        setAnswersMap(data.answers || {});
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load questions:", err);
        setLoading(false);
      });
  }, [subject, locale, mounted]);

  // Timer
  useEffect(() => {
    if (!mounted || loading || quizFinished || !questions[currentIndex]) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, loading, quizFinished, questions, mounted]);

  const handleAnswer = (selectedAnswer: string) => {
    const currentQuestion = questions[currentIndex];
    const correctAnswer = answersMap[currentQuestion.id];
    const isCorrect = selectedAnswer === correctAnswer;
    const pointsEarned = isCorrect ? currentQuestion.points : 0;
    
    const answerRecord = {
      questionId: currentQuestion.id,
      selected: selectedAnswer,
      correct: isCorrect,
      pointsEarned: pointsEarned,
      timeSpent: currentQuestion.timeLimit - timeLeft,
    };
    
    setAnswers(prev => [...prev, answerRecord]);
    
    if (isCorrect) {
      setScore(prev => prev + pointsEarned);
    }
    
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(questions[currentIndex + 1]?.timeLimit || 30);
    } else {
      setQuizFinished(true);
      const finalScore = score + (isCorrect ? pointsEarned : 0);
      const finalAnswers = [...answers, answerRecord];
      onComplete(finalScore, finalAnswers);
    }
  };

  const handleTimeout = () => {
    const currentQuestion = questions[currentIndex];
    const answerRecord = {
      questionId: currentQuestion.id,
      selected: null,
      correct: false,
      pointsEarned: 0,
      timeSpent: currentQuestion.timeLimit,
    };
    
    setAnswers(prev => [...prev, answerRecord]);
    
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(questions[currentIndex + 1]?.timeLimit || 30);
    } else {
      setQuizFinished(true);
      onComplete(score, [...answers, answerRecord]);
    }
  };

  // Don't render anything on server (fix hydration)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
        <div className="text-white text-xl">Loading battle...</div>
      </div>
    );
  }

  if (quizFinished) {
    const correctCount = answers.filter(a => a.correct).length;
    const totalPoints = answers.reduce((sum, a) => sum + a.pointsEarned, 0);
    const accuracy = Math.round((correctCount / answers.length) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black flex items-center justify-center p-4">
        <div className="text-center py-12 max-w-md mx-auto">
          <div className="text-white text-4xl mb-4">🎉 Battle Complete! 🎉</div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6">
            <div className="text-5xl font-bold text-yellow-400 mb-2">
              {totalPoints}
            </div>
            <div className="text-white/70 text-sm mb-4">Total Points</div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{correctCount}</div>
                <div className="text-white/70 text-sm">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{answers.length - correctCount}</div>
                <div className="text-white/70 text-sm">Incorrect</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="text-white/70 text-sm">Accuracy</div>
              <div className="text-xl font-bold text-blue-400">{accuracy}%</div>
            </div>
          </div>
          
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-white/70 text-sm mb-2">
            <span>Question {currentIndex + 1}/{questions.length}</span>
            <span>Score: {score}</span>
            <span>Time: {timeLeft}s</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-blue-600 rounded-full h-2 transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6">
          <div className="text-white/70 text-sm mb-2">
            {currentQuestion.topic} • {currentQuestion.difficulty}
          </div>
          <div className="text-white text-xl mb-6">
            {currentQuestion.question}
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-1 mb-6">
            <div
              className="bg-yellow-500 rounded-full h-1 transition-all"
              style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}
            />
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid gap-4">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-white text-left hover:bg-white/20 transition-all"
            >
              {String.fromCharCode(65 + idx)}. {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
