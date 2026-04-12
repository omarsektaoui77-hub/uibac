from app.core.database import engine
from app.models import database_models
from app.routes import quiz, pdf, analytics
from app.core.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create tables
database_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BacQuest Backend")

# Setup CORS to allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your Next.js domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
app.include_router(pdf.router, prefix="/pdf", tags=["pdf"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the BacQuest BacQuest API"}

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
