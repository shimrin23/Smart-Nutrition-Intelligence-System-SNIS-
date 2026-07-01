from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import users, food_logs, ai, ml
from app.config import settings
from contextlib import asynccontextmanager
from app.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    print("[*] Starting up FastAPI app...")
    try:
        init_db()
        print("[+] PostgreSQL database tables initialized successfully.")
    except Exception as e:
        print(f"[-] Failed to initialize database tables: {e}")
    yield
    # Shutdown logic (if any) can go here
    print("[*] Shutting down FastAPI app...")

app = FastAPI(
    title="Smart Nutrition Intelligence System (SNIS) API",
    description="Backend API for manual/AI nutrition tracking and diet recommendation coaching.",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS so our React frontend can connect
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# Add deployed frontend URL from env (e.g. https://your-app.vercel.app)
if settings.FRONTEND_URL and "localhost" not in settings.FRONTEND_URL:
    allowed_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users.router)
app.include_router(food_logs.router)
app.include_router(ai.router)
app.include_router(ml.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Smart Nutrition Intelligence System (SNIS) API!",
        "status": "healthy",
        "docs_url": "/docs"  # FastAPI's auto-generated interactive documentation
    }
