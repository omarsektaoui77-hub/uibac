import { NextRequest, NextResponse } from 'next/server';
import { APILogger } from '@/lib/api-logger';

export const runtime = "nodejs";
export const maxDuration = 30; // 30 second timeout for Vercel

const QUESTION_GENERATION_PROMPT = {
  en: `You are generating quiz questions for Moroccan Baccalaureate students.

Generate 5 multiple-choice questions.

Rules:
- 4 choices only
- 1 correct answer
- Include explanation
- Keep questions clear and exam-style
- Difficulty: {{difficulty}}

Return JSON only:
[
  {
    "question": "...",
    "choices": ["A", "B", "C", "D"],
    "answer": "B",
    "explanation": "...",
    "xp": 20
  }
]`,

  ar: `You are generating quiz questions for Moroccan Baccalaureate students.

Generate 5 multiple-choice questions.

Rules:
- 4 choices only
- 1 correct answer
- Include explanation
- Keep questions clear and exam-style
- Difficulty: {{difficulty}}
- LANGUAGE: Arabic
- Use energetic tone
- Make it engaging and motivational

Example style:
fire! Calculate the derivative and show your skills!

Return JSON only:
[
  {
    "question": "...",
    "choices": ["A", "B", "C", "D"],
    "answer": "B",
    "explanation": "...",
    "xp": 20
  }
]`,

  fr: `You are generating quiz questions for Moroccan Baccalaureate students.

Generate 5 multiple-choice questions.

Rules:
- 4 choices only
- 1 correct answer
- Include explanation
- Keep questions clear and exam-style
- Difficulty: {{difficulty}}
- LANGUAGE: French

Return JSON only:
[
  {
    "question": "...",
    "choices": ["A", "B", "C", "D"],
    "answer": "B",
    "explanation": "...",
    "xp": 20
  }
]`,

  es: `You are generating quiz questions for Moroccan Baccalaureate students.

Generate 5 multiple-choice questions.

Rules:
- 4 choices only
- 1 correct answer
- Include explanation
- Keep questions clear and exam-style
- Difficulty: {{difficulty}}
- LANGUAGE: Spanish

Return JSON only:
[
  {
    "question": "...",
    "choices": ["A", "B", "C", "D"],
    "answer": "B",
    "explanation": "...",
    "xp": 20
  }
]`
};

export async function POST(request: NextRequest) {
  APILogger.logRequest(request);
  
  const body = await request.json();
  const { concepts, difficulty = "medium", language = "en", subject, track } = body;
  
  try {

    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
      return NextResponse.json(
        { error: 'concepts array is required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === "mock") {
      console.log("No API Key detected or mock mode set. Returning mock questions.");
      
      // Return mock questions for development
      const mockQuestions = generateMockQuestions(concepts, difficulty, language);
      return NextResponse.json(mockQuestions);
    }

    // Real LLM Integration (Cost Optimized)
    const promptTemplate = QUESTION_GENERATION_PROMPT[language as keyof typeof QUESTION_GENERATION_PROMPT] || QUESTION_GENERATION_PROMPT.en;
    const prompt = promptTemplate.replace('{{difficulty}}', difficulty);
    
    // Limit concepts to reduce input tokens
    const limitedConcepts = concepts.slice(0, 3).join(', ');
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "user", 
            content: `${prompt}

Concepts: ${limitedConcepts}` 
          }
        ],
        max_tokens: 800, // Cost trick: limit output tokens
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error("AI API request failed: " + response.statusText);
    }

    const data = await response.json();
    let questions = JSON.parse(data.choices[0].message.content);
    
    // Ensure we return an array
    if (!Array.isArray(questions)) {
      questions = questions.questions || [];
    }

    APILogger.logSuccess(request, { questionCount: questions.length, difficulty, language });
    return NextResponse.json(questions);

  } catch (error) {
    APILogger.logError(error, request);
    console.error("Question Generation Error:", error);
    
    // Fallback to mock questions on error
    const fallbackQuestions = generateMockQuestions(
      body?.concepts || ['Mathematics'], 
      body?.difficulty || 'medium', 
      body?.language || 'en'
    );

    return NextResponse.json(fallbackQuestions);
  }
}

function generateMockQuestions(concepts: string[], difficulty: string, language: string) {
  const baseXP = difficulty === 'easy' ? 10 : difficulty === 'hard' ? 30 : 20;
  
  const questions = [
    {
      question: language === 'ar' ? 'fire! What is the main concept in derivatives?' : 
                language === 'fr' ? 'Quel est le concept principal des dérivées ?' :
                language === 'es' ? '¿Cuál es el concepto principal de las derivadas?' :
                'What is the main concept in derivatives?',
      choices: language === 'ar' ? ['Rate of change', 'Area calculation', 'Volume measurement', 'Distance formula'] :
              language === 'fr' ? ['Taux de changement', 'Calcul d\'aire', 'Mesure de volume', 'Formule de distance'] :
              language === 'es' ? ['Tasa de cambio', 'Cálculo de área', 'Medición de volumen', 'Fórmula de distancia'] :
              ['Rate of change', 'Area calculation', 'Volume measurement', 'Distance formula'],
      answer: "A",
      explanation: language === 'ar' ? 'Derivatives measure how fast things change! Great job!' :
                  language === 'fr' ? 'Les dérivées mesurent la vitesse de changement!' :
                  language === 'es' ? '¡Las derivadas miden la velocidad de cambio!' :
                  'Derivatives measure how fast things change!',
      xp: baseXP
    },
    {
      question: language === 'ar' ? 'Show your skills! Calculate: d/dx(x³) = ?' :
                language === 'fr' ? 'Montrez vos compétences! Calculez: d/dx(x³) = ?' :
                language === 'es' ? '¡Muestra tus habilidades! Calcula: d/dx(x³) = ?' :
                'Calculate: d/dx(x³) = ?',
      choices: ['3x²', 'x³', '3x', 'x²'],
      answer: "A",
      explanation: language === 'ar' ? 'Perfect! Using power rule: n*x^(n-1) = 3*x²' :
                  language === 'fr' ? 'Parfait! En utilisant la règle de puissance: n*x^(n-1) = 3*x²' :
                  language === 'es' ? '¡Perfecto! Usando la regla de potencia: n*x^(n-1) = 3*x²' :
                  'Using power rule: n*x^(n-1) = 3*x²',
      xp: baseXP
    },
    {
      question: language === 'ar' ? 'Prove yourself! What does the chain rule help with?' :
                language === 'fr' ? 'Prouvez-vous! À quoi aide la règle de chaîne?' :
                language === 'es' ? '¡Demuéstrate! ¿Para qué ayuda la regla de la cadena?' :
                'What does the chain rule help with?',
      choices: language === 'ar' ? ['Composite functions', 'Simple addition', 'Basic multiplication', 'Division only'] :
              language === 'fr' ? ['Fonctions composées', 'Addition simple', 'Multiplication de base', 'Division seulement'] :
              language === 'es' ? ['Funciones compuestas', 'Suma simple', 'Multiplicación básica', 'Solo división'] :
              ['Composite functions', 'Simple addition', 'Basic multiplication', 'Division only'],
      answer: "A",
      explanation: language === 'ar' ? 'Excellent! Chain rule handles complex functions like sin(x²)' :
                  language === 'fr' ? 'Excellent! La règle de chaîne gère les fonctions complexes comme sin(x²)' :
                  language === 'es' ? '¡Excelente! La regla de la cadena maneja funciones complejas como sin(x²)' :
                  'Chain rule handles complex functions like sin(x²)',
      xp: baseXP + 10
    }
  ];

  return questions;
}
