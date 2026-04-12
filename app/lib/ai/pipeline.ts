import { PROMPT_GENERATE_QUESTIONS } from "./prompts";

export async function generateQuestionsFromText(text: string) {
  // Check if API key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === "mock") {
    console.log("No API Key detected or mock mode set. Returning mock generated questions.");
    // Return mock data that strictly follows the format
    return [
      {
        question: "What is the primary formula for the derivative of x^n?",
        options: ["n*x^(n-1)", "x^(n+1)/(n+1)", "n*x^n", "1/x"],
        correct_answer: "n*x^(n-1)",
        explanation: "The power rule states that the derivative of x^n is n multiplied by x raised to the power of n-1.",
        difficulty: "easy",
        topic: "Derivatives",
        time_estimate: 15
      },
      {
        question: "If f(x) = sin(x), what is f''(x)?",
        options: ["cos(x)", "-sin(x)", "sin(x)", "-cos(x)"],
        correct_answer: "-sin(x)",
        explanation: "The first derivative of sin(x) is cos(x), and the derivative of cos(x) is -sin(x).",
        difficulty: "medium",
        topic: "Trigonometric Derivatives",
        time_estimate: 30
      },
      {
        question: "Determine the limit of sin(x)/x as x approaches 0.",
        options: ["0", "Infinity", "1", "Undefined"],
        correct_answer: "1",
        explanation: "This is a fundamental analytical limit commonly proven using the squeeze theorem.",
        difficulty: "hard",
        topic: "Limits",
        time_estimate: 45
      }
    ];
  }

  // Real LLM Integration
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or preferred model
        messages: [
          { role: "system", content: PROMPT_GENERATE_QUESTIONS },
          { role: "user", content: text.substring(0, 4000) } // Chunk limits for MVP
        ],
        response_format: { type: "json_object" } 
      })
    });

    if (!response.ok) {
      throw new Error("AI API request failed: " + response.statusText);
    }

    const data = await response.json();
    let questionsContent = data.choices[0].message.content;
    
    // Safety parse: in case the model returns an object wrapping an array
    const parsed = JSON.parse(questionsContent);
    return Array.isArray(parsed) ? parsed : parsed.questions || [];

  } catch (error) {
    console.error("AI Generation Error: ", error);
    throw error;
  }
}
