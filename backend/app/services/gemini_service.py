import os
import json
from google import genai
from google.genai import types
from app.config import settings

# Configure SDK
client = None
if settings.GEMINI_API_KEY and "REPLACE" not in settings.GEMINI_API_KEY:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

NUTRITION_SYSTEM_INSTRUCTION = """
You are an expert AI Nutritionist. Your job is to analyze food descriptions or food images and estimate the total nutritional values for the entire meal.
You MUST calculate and return the estimated total macronutrients and micronutrients.

Return a single JSON object with the following fields:
- food_name (str): A clean, human-readable name summarizing the meal (e.g., "2 Eggs and 1 Cup White Rice").
- quantity (float): 1.0
- unit (str): "serving"
- calories (float): Total estimated calories for the entire meal.
- protein (float): Total estimated protein in grams.
- carbs (float): Total estimated carbohydrates in grams.
- fat (float): Total estimated fat in grams.
- fiber (float): Total estimated fiber in grams.
- iron (float): Total estimated iron in mg.
- calcium (float): Total estimated calcium in mg.
- sodium (float): Total estimated sodium in mg.
- explanation (str): A 2-3 sentence explanation of the nutritional value of this meal and any health benefits or things to watch out for.

Return ONLY the JSON object. Do not include any markdown formatting or extra text.
"""

def parse_food_text(text_description: str) -> dict:
    if not settings.GEMINI_API_KEY or "REPLACE" in settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured in .env.")
    if not client:
        raise ValueError("Gemini client could not be initialized.")

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=text_description,
        config=types.GenerateContentConfig(
            system_instruction=NUTRITION_SYSTEM_INSTRUCTION,
            response_mime_type="application/json"
        )
    )

    try:
        return json.loads(response.text)
    except Exception as e:
        print(f"[-] Error parsing Gemini response: {e}. Raw response: {response.text}")
        raise ValueError("Failed to parse nutrition details from the AI response.")

def parse_food_image(image_bytes: bytes, mime_type: str) -> dict:
    if not settings.GEMINI_API_KEY or "REPLACE" in settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured in .env.")
    if not client:
        raise ValueError("Gemini client could not be initialized.")

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=[image_part, "Analyze this food image and provide the nutrient breakdown."],
        config=types.GenerateContentConfig(
            system_instruction=NUTRITION_SYSTEM_INSTRUCTION,
            response_mime_type="application/json"
        )
    )

    try:
        return json.loads(response.text)
    except Exception as e:
        print(f"[-] Error parsing Gemini image response: {e}. Raw response: {response.text}")
        raise ValueError("Failed to parse nutrition details from the image.")
