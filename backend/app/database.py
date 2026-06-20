from sqlmodel import create_engine, SQLModel, Session
from app.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL, echo=True)

def init_db():
    # Import models here so they are registered with SQLModel.metadata before creation
    from app.models import User, FoodLog
    SQLModel.metadata.create_all(engine)

def get_session():
    # Dependency to get db session for requests
    with Session(engine) as session:
        yield session
