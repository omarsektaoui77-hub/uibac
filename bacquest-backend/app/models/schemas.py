from pydantic import BaseModel
from typing import List, Optional

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int # index of the correct option

class QuizResponse(BaseModel):
    title: str
    questions: List[QuizQuestion]

class PDFProcessRequest(BaseModel):
    file_id: str
    topic_focus: Optional[str] = None
