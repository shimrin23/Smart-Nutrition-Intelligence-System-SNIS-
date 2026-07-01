import os
import json
from google import genai
from google.genai import types
from app.config import settings

# Configure SDK
client = None
if settings.GEMINI_API_KEY and "REPLACE" not in settings.GEMINI_API_KEY:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

# System Prompt to guide the model
NUTRITION_SYSTEM_INSTRUCTION = """
You are a precise nutrition analysis assistant. Your job is to analyze food descriptions or food images and return a structured JSON response containing the estimated nutrient breakdown.

Always return a JSON object with the following fields:
- food_name (str): A summary of the food items found (e.g. "Double cheeseburger and fries" or "Grilled chicken salad")
- quantity (float): A default representative quantity (e.g., 1.0 or 150)
- unit (str): The unit of portion (e.g., "grams", "pieces", "plates", "cups")
- calories (float): The total estimated calories in kcal.
- protein (float): The total estimated protein in grams.
- carbs (float): The total estimated carbohydrates in grams.
- fat (float): The total estimated fat in grams.
- fiber (float): The total estimated fiber in grams.
- iron (float): The total estimated iron in milligrams (mg).
- calcium (float): The total estimated calcium in milligrams (mg).
- sodium (float): The total estimated sodium in milligrams (mg).
- explanation (str): A brief, 2-3 sentence description explaining the nutritional values of this meal, how healthy it is, and any specific tips (e.g. high protein, good source of fiber).

If you are unsure, make a reasonable estimate based on standard FDA database values. Do not write text other than the clean JSON object.
"""

def parse_food_text(text_description: str) -> dict:
    if not settings.GEMINI_API_KEY or "REPLACE" in settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured in .env.")
    if not client:
        raise ValueError("Gemini client could not be initialized.")

    response = client.models.generate_content(
        model="gemini-2.0-flash",
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
        model="gemini-2.0-flash",
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
