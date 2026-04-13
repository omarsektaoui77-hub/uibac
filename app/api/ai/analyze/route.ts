import { NextRequest, NextResponse } from 'next/server';

const ANALYZE_PROMPT = `You are an expert Moroccan Baccalaureate teacher.

Analyze the lesson below.

Return STRICT JSON with:
- summary (short)
- keyConcepts (max 5)
- difficulty (easy | medium | hard)
- formulas (if any)
- definitions (short)

Rules:
- Be concise
- Avoid repetition
- Focus on exam-relevant content only

TEXT:
{{lesson}}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, subject, track } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'text field is required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === "mock") {
      console.log("No API Key detected or mock mode set. Returning mock analysis.");
      
      // Return mock analysis for development
      const mockAnalysis = {
        summary: "This lesson covers the fundamentals of derivatives including basic rules, applications, and problem-solving techniques for Moroccan Baccalaureate mathematics.",
        keyConcepts: ["Derivatives", "Power Rule", "Product Rule", "Quotient Rule", "Chain Rule", "Tangent Lines", "Optimization"],
        difficulty: "medium",
        formulas: [
          "f'(a) = lim[h->0] [f(a+h) - f(a)] / h",
          "d/dx(x^n) = n*x^(n-1)",
          "d/dx(uv) = u'v + uv'",
          "d/dx(u/v) = (u'v - uv')/v^2",
          "d/dx(f(g(x))) = f'(g(x)) * g'(x)"
        ],
        definitions: [
          {
            term: "Derivative",
            definition: "The instantaneous rate of change of a function at a given point, representing the slope of the tangent line."
          },
          {
            term: "Tangent Line",
            definition: "A straight line that touches a curve at exactly one point and has the same slope as the curve at that point."
          },
          {
            term: "Optimization",
            definition: "The process of finding maximum or minimum values of a function, often used to solve real-world problems."
          }
        ]
      };

      return NextResponse.json(mockAnalysis);
    }

    // Real LLM Integration (Cost Optimized)
    const limitedText = text.substring(0, 3000); // Cost trick: limit input tokens
    const prompt = ANALYZE_PROMPT.replace('{{lesson}}', limitedText);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 800, // Cost trick: limit output tokens
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error("AI API request failed: " + response.statusText);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error("AI Analysis Error:", error);
    
    // Fallback to mock data on error
    const fallbackAnalysis = {
      summary: "Analysis failed. This appears to be an educational lesson that needs manual review.",
      keyConcepts: ["Concept1", "Concept2"],
      difficulty: "medium",
      formulas: [],
      definitions: []
    };

    return NextResponse.json(fallbackAnalysis);
  }
}
