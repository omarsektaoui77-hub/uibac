import os
import json
import asyncio
from openai import AsyncOpenAI
import google.generativeai as genai
from groq import AsyncGroq
from app.core.config import settings

# Initialize async clients
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

from app.core.constants import VALID_SUBJECT_IDS

async def generate_questions(chunk: str, provider: str = "groq"):
    """
    Dispatcher to generate quiz questions using different AI providers (Async).
    Supported providers: 'openai', 'gemini', 'groq'
    """
    valid_subjects_str = ", ".join(VALID_SUBJECT_IDS)
    
    prompt = f"""
You are an expert Moroccan Bac exam creator.

Generate 5 quiz questions from this content in a JSON list format.

Rules:
- Mix difficulty (easy, medium, hard)
- Use MCQ format
- Include explanation for each answer

The JSON must be an array of objects, where each object has:
- "question": string
- "options": list of 4 strings
- "correct_answer": index of correct option (0-3)
- "explanation": string
- "topic": string (specific sub-topic within the subject)
- "difficulty": string (easy, medium, or hard)
- "subject": string (MUST be one of these IDs: {valid_subjects_str})

Return ONLY the valid JSON array. No preamble, no markdown formatting, no explanation outside the JSON.

Content:
{chunk}
"""

    if provider == "groq":
        return await _generate_with_groq(prompt)
    elif provider == "gemini":
        return await _generate_with_gemini(prompt)
    elif provider == "openai":
        return await _generate_with_openai(prompt)
    else:
        raise ValueError(f"Unsupported provider: {provider}")

async def _generate_with_openai(prompt: str):
    if not openai_client:
        raise ValueError("OpenAI API key not configured")
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You are a helpful assistant that outputs JSON."},
                  {"role": "user", "content": prompt}],
        temperature=0.7,
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content

async def _generate_with_gemini(prompt: str):
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key not configured")
    
    # genai.GenerativeModel.generate_content is normally synchronous, 
    # but we can wrap it or use generate_content_async if available.
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Using the async version of generate_content
    response = await model.generate_content_async(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    return response.text

async def _generate_with_groq(prompt: str):
    if not groq_client:
        raise ValueError("Groq API key not configured")
    
    response = await groq_client.chat.completions.create(
        model="llama-3.1-70b-versatile",
        messages=[{"role": "system", "content": "You are a helpful assistant that outputs JSON."},
                  {"role": "user", "content": prompt}],
        temperature=0.7,
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content
