export const PROMPT_ANALYZE_PDF = `
Analyze the following educational content.

Identify:
- Subject
- Main topics
- Subtopics
- Content type (course, exercise, exam)

Return structured JSON.

CONTENT:
`;

export const PROMPT_GENERATE_QUESTIONS = `
You are an expert Moroccan Bac exam creator.

Generate high-quality quiz questions from the content.

RULES:
- Follow bac difficulty
- Keep questions clear
- Include common mistakes
- Mix difficulty (easy, medium, hard)

OUTPUT FORMAT (Valid JSON Array):
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "...",
    "explanation": "...",
    "difficulty": "easy | medium | hard",
    "topic": "...",
    "time_estimate": 25
  }
]

CONTENT:
`;

export const PROMPT_IMPROVE_QUESTIONS = `
Improve these questions:
- Make them more exam-like
- Remove ambiguity
- Ensure one correct answer
- Increase clarity

INPUT:
`;
