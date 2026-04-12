from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.database_models import UserAnswer, Question, Quiz
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# --- Schemas ---
class AnswerSubmission(BaseModel):
    user_id: str
    question_id: int
    selected_option: int

class PerformanceInsight(BaseModel):
    subject: str
    topic: str
    accuracy: float
    total_answered: int

class WeakTopicsResponse(BaseModel):
    user_id: str
    weak_topics: List[PerformanceInsight]

# --- Endpoints ---

@router.post("/answer")
def record_answer(submission: AnswerSubmission, db: Session = Depends(get_db)):
    """Records a student's answer and checks if it was correct."""
    question = db.query(Question).filter(Question.id == submission.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    is_correct = 1 if submission.selected_option == question.correct_answer_index else 0
    
    new_answer = UserAnswer(
        user_id=submission.user_id,
        question_id=submission.question_id,
        selected_option=submission.selected_option,
        is_correct=is_correct
    )
    
    db.add(new_answer)
    db.commit()
    
    return {
        "is_correct": bool(is_correct),
        "correct_answer_index": question.correct_answer_index,
        "explanation": question.explanation
    }

@router.get("/weak-topics/{user_id}", response_model=WeakTopicsResponse)
def get_weak_topics(user_id: str, db: Session = Depends(get_db)):
    """
    Identifies the student's weakest topics by calculating accuracy rates.
    Filters out topics with too few answers to ensure statistical significance.
    """
    # Join UserAnswer with Question to get topic/subject metadata
    results = (
        db.query(
            Question.subject,
            Question.topic,
            func.avg(UserAnswer.is_correct).label("accuracy"),
            func.count(UserAnswer.id).label("total")
        )
        .join(UserAnswer, Question.id == UserAnswer.question_id)
        .filter(UserAnswer.user_id == user_id)
        .group_by(Question.subject, Question.topic)
        .having(func.count(UserAnswer.id) >= 2) # Only show topics with at least 2 answers
        .order_by("accuracy")
        .limit(3) # Top 3 weakest areas
        .all()
    )
    
    insights = [
        PerformanceInsight(
            subject=r.subject or "General",
            topic=r.topic or "Miscellaneous",
            accuracy=round(float(r.accuracy), 2),
            total_answered=int(r.total)
        ) for r in results
    ]
    
    return WeakTopicsResponse(
        user_id=user_id,
        weak_topics=insights
    )
