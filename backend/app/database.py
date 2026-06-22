from sqlmodel import create_engine, SQLModel, Session
from app.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL, echo=True)

def _safe_add_column(session, sql: str, col_name: str):
    """Run an ALTER TABLE ... ADD COLUMN and silently ignore if column already exists."""
    try:
        from sqlmodel import text
        session.exec(text(sql))
        session.commit()
        print(f"[+] Migration: added column '{col_name}'.")
    except Exception as e:
        session.rollback()
        if "already exists" in str(e).lower():
            pass  # column already present — safe to ignore
        else:
            print(f"[-] Migration note for '{col_name}': {e}")

def init_db():
    # Import models here so they are registered with SQLModel.metadata before creation
    from app.models import User, FoodLog
    SQLModel.metadata.create_all(engine)

    # Safe migrations — add new columns to existing databases
    with Session(engine) as session:
        _safe_add_column(session, 'ALTER TABLE "user" ADD COLUMN password VARCHAR', "password")
        _safe_add_column(session, 'ALTER TABLE "user" ADD COLUMN email VARCHAR', "email")
        _safe_add_column(session, 'ALTER TABLE "user" ADD COLUMN display_name VARCHAR', "display_name")
        _safe_add_column(session, 'ALTER TABLE "user" ADD COLUMN is_verified BOOLEAN DEFAULT FALSE', "is_verified")
        _safe_add_column(session, 'ALTER TABLE "user" ADD COLUMN verification_token VARCHAR', "verification_token")
        _safe_add_column(session, 'ALTER TABLE "user" ADD COLUMN reset_token VARCHAR', "reset_token")
        _safe_add_column(session, 'ALTER TABLE "user" ADD COLUMN reset_token_expiry TIMESTAMP', "reset_token_expiry")

def get_session():
    # Dependency to get db session for requests
    with Session(engine) as session:
        yield session
