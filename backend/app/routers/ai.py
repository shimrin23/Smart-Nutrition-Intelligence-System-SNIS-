from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlmodel import Session
from typing import List, Optional, Dict
from pydantic import BaseModel
from app.database import get_session
from app.models import User
from app.services import gemini_service
from google import genai
from google.genai import types
from app.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Integration"])

# Input validation schemas
class TextAnalysisRequest(BaseModel):
    text: str

class ChatHistoryMessage(BaseModel):
    role: str  # "user" or "model" / "assistant"
    content: str

class ChatRequest(BaseModel):
    user_id: int
    message: str
    history: List[ChatHistoryMessage] = []

@router.post("/analyze-text")
def analyze_food_text(request: TextAnalysisRequest):
    try:
        nutrition_data = gemini_service.parse_food_text(request.text)
        return nutrition_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-image")
async def analyze_food_image(file: UploadFile = File(...)):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type: {file.content_type}. Only JPEG, PNG, and WEBP images are supported."
        )
        
    try:
        contents = await file.read()
        nutrition_data = gemini_service.parse_food_image(contents, file.content_type)
        return nutrition_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/chat")
def chat_coach(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    if current_user.id != request.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    user = db.get(User, request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    # Retrieve Gemini API key
    from app.config import settings
    if not settings.GEMINI_API_KEY or "REPLACE" in settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")

    # Design the coach system instructions incorporating user target context
    coach_prompt_context = f"""
You are a friendly, expert, and encouraging personal AI Nutrition Coach. 
The client you are advising is: {user.username}.
Here are their specific health/nutrition metrics:
- Age: {user.age} years old
- Gender: {user.gender}
- Current Weight: {user.weight_kg} kg
- Height: {user.height_cm} cm
- Activity level: {user.activity_level.replace('_', ' ')}
- Core Goal: {user.goal.replace('_', ' ')}

Target daily intake calculated for them:
- Calories: {user.target_calories} kcal/day
- Protein: {user.target_protein} grams/day
- Carbohydrates: {user.target_carbs} grams/day
- Fat: {user.target_fat} grams/day

Provide scientific, actionable, and encouraging recommendations. Highlight portion control, hydration, and nutritional balance.
Keep your response short (2-3 concise paragraphs), clean, and formatting-friendly. You can use markdown bullet points for list suggestions.
Do not refer to yourself as an AI, speak naturally as a human coach.
"""

    try:
        from app.services.gemini_service import client as genai_client
        if not genai_client:
            raise HTTPException(status_code=500, detail="Gemini client is not initialized.")

        # Build contents from history
        contents = []
        for msg in request.history:
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))

        # Append latest message
        contents.append(types.Content(role="user", parts=[types.Part(text=request.message)]))

        response = genai_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=coach_prompt_context
            )
        )
        return {"response": response.text}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[-] Error in AI Coach Chat endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))
