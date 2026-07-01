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
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")


    # Mail settings
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "SNIS AI")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # Resend email API (SMTP is blocked on Railway)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")

    import secrets
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    if not SECRET_KEY or SECRET_KEY == "your-super-secret-key-change-in-production":
        SECRET_KEY = secrets.token_urlsafe(32)
        print("WARNING: No SECRET_KEY found in environment. A temporary random key was generated. Tokens will be invalidated upon server restart.")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

settings = Settings()
