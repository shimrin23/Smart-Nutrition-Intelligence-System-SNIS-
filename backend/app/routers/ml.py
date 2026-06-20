from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from app.database import get_session
from app.models import User, FoodLog
from app.services import ml_service
from app.routers.users import calculate_targets
from datetime import datetime, date, timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/ml", tags=["Machine Learning Analytics"])

class RecommendationResponse(BaseModel):
    food_name: str
    protein: float
    carbs: float
    fat: float
    category: str

class WeightPredictionResponse(BaseModel):
    day: int
    weight: float

@router.get("/recommend-foods/{user_id}", response_model=List[RecommendationResponse])
def recommend_foods_for_user(user_id: int, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    # Get today's total macros consumed so far
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    statement = select(FoodLog).where(
        FoodLog.user_id == user_id,
        FoodLog.timestamp >= today_start,
        FoodLog.timestamp <= today_end
    )
    logs = db.exec(statement).all()
    
    logged_protein = sum(log.protein for log in logs)
    logged_carbs = sum(log.carbs for log in logs)
    logged_fat = sum(log.fat for log in logs)
    
    # Calculate macro deficits
    prot_deficit = max(0.0, user.target_protein - logged_protein)
    carb_deficit = max(0.0, user.target_carbs - logged_carbs)
    fat_deficit = max(0.0, user.target_fat - logged_fat)
    
    # Call K-Means service
    recommendations = ml_service.get_food_recommendations(prot_deficit, carb_deficit, fat_deficit)
    return recommendations

@router.get("/predict-weight/{user_id}", response_model=List[WeightPredictionResponse])
def predict_weight_for_user(user_id: int, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    # Calculate User TDEE (Total Daily Energy Expenditure)
    # Re-use our calculator to find BMR
    gender_factor = 5 if user.gender.lower() == "male" else (-161 if user.gender.lower() == "female" else -78)
    bmr = (10 * user.weight_kg) + (6.25 * user.height_cm) - (5 * user.age) + gender_factor
    
    multipliers = {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    multiplier = multipliers.get(user.activity_level.lower(), 1.2)
    tdee = bmr * multiplier
    
    # Fetch past 7 days of logs to find actual calorie balances
    past_days = 7
    start_date = date.today() - timedelta(days=past_days - 1)
    start_dt = datetime.combine(start_date, datetime.min.time())
    
    statement = select(FoodLog).where(
        FoodLog.user_id == user_id,
        FoodLog.timestamp >= start_dt
    )
    logs = db.exec(statement).all()
    
    # Group logged calories by date
    daily_calories = {}
    for i in range(past_days):
        d = (start_date + timedelta(days=i)).isoformat()
        daily_calories[d] = 0.0
        
    for log in logs:
        d_str = log.timestamp.date().isoformat()
        if d_str in daily_calories:
            daily_calories[d_str] += log.calories
            
    # Calculate weight and calorie balance histories
    calorie_balance_history = []
    weight_history = []
    
    current_w = user.weight_kg
    # Chronologically track simulated weights based on energy deficits
    for d_str, cals in sorted(daily_calories.items()):
        balance = cals - tdee
        calorie_balance_history.append(balance)
        # 7700 kcal deficit = 1 kg loss
        current_w += (balance / 7700.0)
        weight_history.append(current_w)
        
    # Call Linear Regression service
    predictions = ml_service.forecast_weight_trajectory(
        weight_history=weight_history,
        calorie_balance_history=calorie_balance_history,
        current_weight=user.weight_kg
    )
    return predictions
