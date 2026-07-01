import requests
from app.config import settings

USDA_API_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

def get_nutrition_for_item(food_name: str, weight_grams: float) -> dict:
    """
    Searches the USDA FoodData Central API for a food item and scales its nutrients based on weight.
    Returns a dictionary of standard nutritional values.
    """
    if not settings.USDA_API_KEY or "REPLACE" in settings.USDA_API_KEY:
        raise ValueError("USDA API key is not configured in .env.")
        
    params = {
        "api_key": settings.USDA_API_KEY,
        "query": food_name,
        "pageSize": 1,
        "dataType": "Foundation,SR Legacy"
    }
    
    response = requests.get(USDA_API_URL, params=params)
    
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch data from USDA API: {response.text}")
        
    data = response.json()
    if not data.get("foods"):
        raise ValueError(f"No USDA food data found for: {food_name}")
        
    food = data["foods"][0]
    nutrients = food.get("foodNutrients", [])
    
    # Extract specific nutrients per 100g.
    # Common USDA Nutrient IDs:
    # 1008: Energy (kcal)
    # 1003: Protein (g)
    # 1005: Carbohydrate (g)
    # 1004: Total lipid (fat) (g)
    # 1079: Fiber (g)
    # 1089: Iron (mg)
    # 1087: Calcium (mg)
    # 1093: Sodium (mg)
    
    def get_nutrient_val(nutrient_id: int) -> float:
        for n in nutrients:
            if n.get("nutrientNumber") == str(nutrient_id) or n.get("nutrientId") == nutrient_id:
                return float(n.get("value", 0.0))
        return 0.0

    # Base values are per 100g. Scale by (weight_grams / 100)
    multiplier = weight_grams / 100.0
    
    return {
        "food_name": food_name.title(),
        "calories": get_nutrient_val(1008) * multiplier,
        "protein": get_nutrient_val(1003) * multiplier,
        "carbs": get_nutrient_val(1005) * multiplier,
        "fat": get_nutrient_val(1004) * multiplier,
        "fiber": get_nutrient_val(1079) * multiplier,
        "iron": get_nutrient_val(1089) * multiplier,
        "calcium": get_nutrient_val(1087) * multiplier,
        "sodium": get_nutrient_val(1093) * multiplier,
    }
