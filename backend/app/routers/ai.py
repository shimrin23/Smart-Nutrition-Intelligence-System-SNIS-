from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional, Dict
from pydantic import BaseModel
from app.database import get_session
from app.models import User, FoodCache
from app.services import gemini_service, usda_service
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
def analyze_food_text(request: TextAnalysisRequest, db: Session = Depends(get_session)):
    query_str = request.text.lower().strip()
    
    # 1. Check Cache
    statement = select(FoodCache).where(FoodCache.query_string == query_str)
    cached = db.exec(statement).first()
    if cached:
        return {
            "food_name": cached.food_name,
            "quantity": cached.quantity,
            "unit": cached.unit,
            "calories": cached.calories,
            "protein": cached.protein,
            "carbs": cached.carbs,
            "fat": cached.fat,
            "fiber": cached.fiber,
            "iron": cached.iron,
            "calcium": cached.calcium,
            "sodium": cached.sodium
        }

    # 2. AI Parsing
    try:
        items = gemini_service.parse_food_text(request.text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # 3. USDA Lookup & Summation
    total_nutrients = {
        "calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0,
        "fiber": 0.0, "iron": 0.0, "calcium": 0.0, "sodium": 0.0
    }
    food_names = []
    
    for item in items:
        try:
            nutrients = usda_service.get_nutrition_for_item(item.get("food_name", ""), item.get("weight_grams", 100))
            food_names.append(nutrients["food_name"])
            for key in total_nutrients.keys():
                total_nutrients[key] += nutrients[key]
        except Exception as e:
            print(f"Failed to fetch USDA for {item.get('food_name')}: {e}")
            
    if not food_names:
        raise HTTPException(status_code=400, detail="Could not determine nutrition for the provided text.")

    final_food_name = ", ".join(food_names)
    
    # 4. Save to Cache
    new_cache = FoodCache(
        query_string=query_str,
        food_name=final_food_name,
        quantity=1.0,
        unit="serving",
        calories=total_nutrients["calories"],
        protein=total_nutrients["protein"],
        carbs=total_nutrients["carbs"],
        fat=total_nutrients["fat"],
        fiber=total_nutrients["fiber"],
        iron=total_nutrients["iron"],
        calcium=total_nutrients["calcium"],
        sodium=total_nutrients["sodium"]
    )
    db.add(new_cache)
    db.commit()
    
    return {
        "food_name": new_cache.food_name,
        "quantity": new_cache.quantity,
        "unit": new_cache.unit,
        "calories": new_cache.calories,
        "protein": new_cache.protein,
        "carbs": new_cache.carbs,
        "fat": new_cache.fat,
        "fiber": new_cache.fiber,
        "iron": new_cache.iron,
        "calcium": new_cache.calcium,
        "sodium": new_cache.sodium
    }

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
        items = gemini_service.parse_food_image(contents, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    total_nutrients = {
        "calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0,
        "fiber": 0.0, "iron": 0.0, "calcium": 0.0, "sodium": 0.0
    }
    food_names = []
    
    for item in items:
        try:
            nutrients = usda_service.get_nutrition_for_item(item.get("food_name", ""), item.get("weight_grams", 100))
            food_names.append(nutrients["food_name"])
            for key in total_nutrients.keys():
                total_nutrients[key] += nutrients[key]
        except Exception as e:
            print(f"Failed to fetch USDA for image item {item.get('food_name')}: {e}")
            
    if not food_names:
        raise HTTPException(status_code=400, detail="Could not determine nutrition for the provided image.")

    return {
        "food_name": ", ".join(food_names),
        "quantity": 1.0,
        "unit": "serving",
        "calories": total_nutrients["calories"],
        "protein": total_nutrients["protein"],
        "carbs": total_nutrients["carbs"],
        "fat": total_nutrients["fat"],
        "fiber": total_nutrients["fiber"],
        "iron": total_nutrients["iron"],
        "calcium": total_nutrients["calcium"],
        "sodium": total_nutrients["sodium"]
    }

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
            model="gemini-3.1-flash-lite",
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
