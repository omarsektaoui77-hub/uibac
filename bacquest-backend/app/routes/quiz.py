from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.database_models import Quiz, Question
from app.models.schemas import QuizResponse
from typing import List

router = APIRouter()

@router.get("/", response_model=List[dict])
def list_quizzes(db: Session = Depends(get_db)):
    """Returns a list of all saved quizzes."""
    quizzes = db.query(Quiz).all()
    return [
        {
            "id": q.id,
            "title": q.title,
            "count": q.total_questions,
            "created_at": q.created_at
        } for q in quizzes
    ]

@router.get("/{quiz_id}", response_model=dict)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """Fetches a specific quiz and all its questions."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    return {
        "id": quiz.id,
        "title": quiz.title,
        "questions": [
            {
                "question": q.text,
                "options": q.options, # Note: needs json.loads if stored as string
                "correct_answer": q.correct_answer_index,
                "explanation": q.explanation,
                "topic": q.topic,
                "difficulty": q.difficulty
            } for q in quiz.questions
        ]
    }
