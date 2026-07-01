from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from app.database import get_session
from app.models import User, FoodLog
from app.services import ml_service
from app.routers.users import calculate_targets
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from app.auth import get_current_user

router = APIRouter(prefix="/ml", tags=["Machine Learning Analytics"])

class RecommendationResponse(BaseModel):
    food_name: str
    protein: float
    carbs: float
    fat: float
    category: str

@router.get("/recommend-foods/{user_id}", response_model=List[RecommendationResponse])
def recommend_foods_for_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
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

