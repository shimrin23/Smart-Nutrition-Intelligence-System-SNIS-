import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

class Settings:
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "snis")
    
    @property
    def DATABASE_URL(self) -> str:
        # Build standard PostgreSQL connection string for SQLAlchemy
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
