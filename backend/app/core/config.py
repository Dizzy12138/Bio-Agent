from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Biomedical Agent Platform"
    DEBUG: bool = True
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "biomedical_platform"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # PostgreSQL
    POSTGRES_URL: str = "postgresql://user:password@localhost:5432/biomedical"

    # LLM Keys
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # External Paper API (for import_documents.py)
    PAPER_API_TOKEN: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore unknown fields in .env

settings = Settings()
