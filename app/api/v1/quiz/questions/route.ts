import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subject = searchParams.get("subject");
    let locale = searchParams.get("locale") || "fr";
    
    // Validate locale
    const validLocales = ["fr", "en", "ar", "es"];
    if (!validLocales.includes(locale)) {
      locale = "fr";
    }
    
    const limit = parseInt(searchParams.get("limit") || "5");

    // Build path to questions directory for specific locale
    const questionsDir = path.join(process.cwd(), "data", "questions", locale);
    
    console.log("Loading questions from:", questionsDir);
    console.log("Subject filter:", subject);
    console.log("Locale:", locale);
    
    // Check if directory exists
    if (!fs.existsSync(questionsDir)) {
      console.error("Questions directory not found:", questionsDir);
      // Return fallback questions for this locale
      const fallbackQuestions = getFallbackQuestions(locale, subject);
      return NextResponse.json({
        questions: fallbackQuestions,
        total: fallbackQuestions.length,
        answers: createAnswersMap(fallbackQuestions),
      });
    }
    
    const files = fs.readdirSync(questionsDir);
    let allQuestions: any[] = [];
    
    // Filter files by subject if specified
    const targetFiles = subject 
      ? files.filter(f => f.includes(subject.toLowerCase()))
      : files;
    
    for (const file of targetFiles) {
      const filePath = path.join(questionsDir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(fileContent);
      
      if (data.questions && Array.isArray(data.questions)) {
        allQuestions = [...allQuestions, ...data.questions];
      }
    }
    
    // If no questions found, use fallback
    if (allQuestions.length === 0) {
      const fallbackQuestions = getFallbackQuestions(locale, subject);
      return NextResponse.json({
        questions: fallbackQuestions,
        total: fallbackQuestions.length,
        answers: createAnswersMap(fallbackQuestions),
      });
    }
    
    // Shuffle and limit questions
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit);
    
    // Create answers map
    const answersMap: Record<string, string> = {};
    selected.forEach(q => {
      answersMap[q.id] = q.correctAnswer;
    });
    
    // Remove correctAnswer from questions sent to client
    const questionsForClient = selected.map(({ correctAnswer, ...q }) => q);
    
    return NextResponse.json({
      questions: questionsForClient,
      total: selected.length,
      answers: answersMap,
    });
  } catch (error) {
    console.error("Error loading questions:", error);
    return NextResponse.json(
      { error: "Failed to load questions", questions: [], answers: {} },
      { status: 500 }
    );
  }
}

// Fallback questions for each locale
function getFallbackQuestions(locale: string, subject: string | null): any[] {
  const fallbacks: Record<string, any[]> = {
    fr: [
      {
        id: "fallback_fr_1",
        topic: "Général",
        difficulty: "facile",
        question: "Quelle est la capitale de la France ?",
        options: ["Londres", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        points: 10,
        timeLimit: 30
      },
      {
        id: "fallback_fr_2",
        topic: "Général",
        difficulty: "facile",
        question: "Quelle planète est connue comme la planète rouge ?",
        options: ["Mars", "Jupiter", "Vénus", "Saturne"],
        correctAnswer: "Mars",
        points: 10,
        timeLimit: 30
      }
    ],
    en: [
      {
        id: "fallback_en_1",
        topic: "General",
        difficulty: "easy",
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        points: 10,
        timeLimit: 30
      },
      {
        id: "fallback_en_2",
        topic: "General",
        difficulty: "easy",
        question: "Which planet is known as the Red Planet?",
        options: ["Mars", "Jupiter", "Venus", "Saturn"],
        correctAnswer: "Mars",
        points: 10,
        timeLimit: 30
      }
    ],
    ar: [
      {
        id: "fallback_ar_1",
        topic: "عام",
        difficulty: "سهل",
        question: "ما هي عاصمة فرنسا؟",
        options: ["لندن", "برلين", "باريس", "مدريد"],
        correctAnswer: "باريس",
        points: 10,
        timeLimit: 30
      }
    ],
    es: [
      {
        id: "fallback_es_1",
        topic: "General",
        difficulty: "fácil",
        question: "¿Cuál es la capital de Francia?",
        options: ["Londres", "Berlín", "París", "Madrid"],
        correctAnswer: "París",
        points: 10,
        timeLimit: 30
      }
    ]
  };
  
  return fallbacks[locale] || fallbacks.fr;
}

function createAnswersMap(questions: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  questions.forEach(q => {
    map[q.id] = q.correctAnswer;
  });
  return map;
}
