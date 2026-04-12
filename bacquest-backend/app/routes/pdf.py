import os
import json
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import shutil
from sqlalchemy.orm import Session
from app.services.pdf_parser import extract_text_from_pdf
from app.services.chunker import chunk_text
from app.services.ai_generator import generate_questions
from app.core.database import get_db
from app.models.database_models import Quiz, Question

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def clean_json_response(text: str):
    """Parses JSON even if the AI wraps it in markdown blocks."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    try:
        data = json.loads(text.strip())
        # If the return is a dict with "questions" key, extract just the list of questions
        if isinstance(data, dict) and "questions" in data:
            return data["questions"]
        return data
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}. Raw text: {text}")
        raise

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), provider: str = "groq", db: Session = Depends(get_db)):
    """
    Optimized Upload Route:
    - Extracts text from PDF
    - Chunks text
    - Generates questions in parallel
    - PERSISTS questions to the database
    """
    file_path = f"temp_{file.filename}"
    logger.info(f"Received upload: {file.filename} with provider: {provider}")

    try:
        # Save file securely
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Step 1: Extract text
        text = extract_text_from_pdf(file_path)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        # Step 2: Chunk
        chunks = chunk_text(text)
        process_limit = 2
        target_chunks = chunks[:process_limit]

        # Step 3: Parallel Generation
        logger.info(f"Processing {len(target_chunks)} chunks in parallel...")
        tasks = [generate_questions(chunk, provider=provider) for chunk in target_chunks]
        raw_responses = await asyncio.gather(*tasks, return_exceptions=True)

        all_generated_questions = []
        for i, raw_response in enumerate(raw_responses):
            if isinstance(raw_response, Exception):
                logger.error(f"Error in chunk {i}: {raw_response}")
                continue
            
            try:
                json_data = clean_json_response(raw_response)
                if isinstance(json_data, list):
                    all_generated_questions.extend(json_data)
                else:
                    all_generated_questions.append(json_data)
            except Exception as e:
                logger.error(f"Error parsing chunk {i}: {e}")
                continue

        # Step 4: Persist to Database (Approved Roadmap Step 3)
        if not all_generated_questions:
            raise HTTPException(status_code=500, detail="AI failed to generate any valid questions.")

        # Extract subject from first question if available for the Quiz total
        detected_subject = all_generated_questions[0].get("subject") if all_generated_questions else "unknown"

        # Create a Quiz record
        new_quiz = Quiz(
            title=f"Quiz from {file.filename}",
            subject=detected_subject,
            total_questions=len(all_generated_questions)
        )
        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)

        # Add questions
        for q_data in all_generated_questions:
            # Handle potential slightly different field names from AI
            question_text = q_data.get("question") or q_data.get("q")
            options = q_data.get("options") or q_data.get("choices")
            correct_idx = q_data.get("correct_answer")
            explanation = q_data.get("explanation")
            topic = q_data.get("topic")
            difficulty = q_data.get("difficulty")
            subject = q_data.get("subject")

            if question_text and options:
                db_question = Question(
                    quiz_id=new_quiz.id,
                    text=question_text,
                    options=json.dumps(options),
                    correct_answer_index=correct_idx if isinstance(correct_idx, int) else 0,
                    explanation=explanation,
                    topic=topic,
                    difficulty=difficulty,
                    subject=subject
                )
                db.add(db_question)
        
        db.commit()
        logger.info(f"Successfully generated and saved {len(all_generated_questions)} questions to Quiz ID {new_quiz.id}.")

        return {
            "status": "success",
            "quiz_id": new_quiz.id,
            "message": f"Quiz generated and saved with {len(all_generated_questions)} questions",
            "questions": all_generated_questions
        }
        
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
