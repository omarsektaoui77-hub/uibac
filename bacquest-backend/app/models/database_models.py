from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    subject = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    total_questions = Column(Integer, default=0)

    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    text = Column(String)
    options = Column(Text)  # JSON string of options
    correct_answer_index = Column(Integer)
    explanation = Column(Text, nullable=True)
    topic = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    subject = Column(String, nullable=True)

    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("UserAnswer", back_populates="question")

class UserAnswer(Base):
    __tablename__ = "user_answers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)  # Can be Firebase UID or persistent LocalStorage ID
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_option = Column(Integer)
    is_correct = Column(Integer)  # 1 for correct, 0 for incorrect
    answered_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="answers")
