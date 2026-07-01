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
You are a precise nutrition parser. Your job is to analyze food descriptions or food images and extract the individual food items and their estimated weights.
Do NOT attempt to calculate calories or macros yourself.

Always return a JSON array (list) of objects, where each object has the following fields:
- food_name (str): A clean, standardized name for the food item (e.g., "Egg", "White Rice", "Chicken Breast").
- weight_grams (float): The estimated weight of the portion in grams. You must estimate this based on the user's provided quantity (e.g., 1 large egg = 50g, 1 cup white rice = 158g, 1 slice bread = 30g). If you are unsure, make a reasonable estimate for a standard serving.

Return ONLY the JSON array. Do not include any other text or markdown formatting.
Example output:
[
  {"food_name": "Large Egg", "weight_grams": 100},
  {"food_name": "White Rice", "weight_grams": 158}
]
"""

def parse_food_text(text_description: str) -> list:
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

def parse_food_image(image_bytes: bytes, mime_type: str) -> list:
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
