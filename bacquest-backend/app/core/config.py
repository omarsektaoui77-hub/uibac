from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./bacquest.db"
    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
