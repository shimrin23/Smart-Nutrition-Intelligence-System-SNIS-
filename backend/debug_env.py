import os
from dotenv import load_dotenv
from app.config import settings

print("--- Debugging Env Variables ---")
print("Current Working Directory:", os.getcwd())
print("Does .env file exist?", os.path.exists(".env"))

# Load dotenv manually and print key presence
load_dotenv()
manual_key = os.getenv("GEMINI_API_KEY")
print("Manual load_dotenv() GEMINI_API_KEY:", manual_key[:10] + "..." if manual_key else "None")

# Print what the app Settings class loaded
settings_key = settings.GEMINI_API_KEY
print("Settings class GEMINI_API_KEY:", settings_key[:10] + "..." if settings_key else "None")
