from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List, Optional
from app.database import get_session
from app.models import FoodLog, User
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from app.auth import get_current_user

router = APIRouter(prefix="/food-logs", tags=["Food Logs"])

# Pydantic schemas for request validation
class FoodLogCreate(BaseModel):
    user_id: int
    food_name: str
    quantity: float
    unit: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: Optional[float] = 0.0
    iron: Optional[float] = 0.0
    calcium: Optional[float] = 0.0
    sodium: Optional[float] = 0.0
    image_path: Optional[str] = None
    timestamp: Optional[datetime] = None

class FoodLogUpdate(BaseModel):
    food_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None
    iron: Optional[float] = None
    calcium: Optional[float] = None
    sodium: Optional[float] = None
    image_path: Optional[str] = None
    timestamp: Optional[datetime] = None

# Custom response schema for daily summary
class DailySummary(BaseModel):
    date: str
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fiber: float
    total_iron: float
    total_calcium: float
    total_sodium: float

@router.post("/", response_model=FoodLog, status_code=status.HTTP_201_CREATED)
def create_food_log(log_data: FoodLogCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    if current_user.id != log_data.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Verify user exists
    user = db.get(User, log_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    log_time = log_data.timestamp or datetime.utcnow()
    
    new_log = FoodLog(
        user_id=log_data.user_id,
        food_name=log_data.food_name,
        quantity=log_data.quantity,
        unit=log_data.unit,
        calories=log_data.calories,
        protein=log_data.protein,
        carbs=log_data.carbs,
        fat=log_data.fat,
        fiber=log_data.fiber or 0.0,
        iron=log_data.iron or 0.0,
        calcium=log_data.calcium or 0.0,
        sodium=log_data.sodium or 0.0,
        image_path=log_data.image_path,
        timestamp=log_time
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@router.get("/user/{user_id}", response_model=List[FoodLog])
def get_user_food_logs(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Verify user exists
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    # Get all logs sorted by newest timestamp
    statement = select(FoodLog).where(FoodLog.user_id == user_id).order_by(FoodLog.timestamp.desc())
    return db.exec(statement).all()

@router.get("/user/{user_id}/summary", response_model=List[DailySummary])
def get_user_daily_summary(
    user_id: int, 
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Verify user exists
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    # Default to past 7 days if dates not provided
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=6)
        
    # Convert dates to datetime boundaries
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    # Query logs within range
    statement = select(FoodLog).where(
        FoodLog.user_id == user_id,
        FoodLog.timestamp >= start_dt,
        FoodLog.timestamp <= end_dt
    )
    logs = db.exec(statement).all()
    
    # Group logs by date
    daily_data = {}
    
    # Pre-populate dates in range to show days with 0 logs
    current_date = start_date
    while current_date <= end_date:
        daily_data[current_date.isoformat()] = {
            "total_calories": 0.0,
            "total_protein": 0.0,
            "total_carbs": 0.0,
            "total_fat": 0.0,
            "total_fiber": 0.0,
            "total_iron": 0.0,
            "total_calcium": 0.0,
            "total_sodium": 0.0
        }
        current_date += timedelta(days=1)
        
    for log in logs:
        log_date_str = log.timestamp.date().isoformat()
        if log_date_str in daily_data:
            day = daily_data[log_date_str]
            day["total_calories"] += log.calories
            day["total_protein"] += log.protein
            day["total_carbs"] += log.carbs
            day["total_fat"] += log.fat
            day["total_fiber"] += log.fiber
            day["total_iron"] += log.iron
            day["total_calcium"] += log.calcium
            day["total_sodium"] += log.sodium
            
    # Format to list of DailySummary
    summaries = []
    for date_str, metrics in sorted(daily_data.items()):
        summaries.append(DailySummary(date=date_str, **metrics))
        
    return summaries

@router.get("/{log_id}", response_model=FoodLog)
def get_food_log(log_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    log = db.get(FoodLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Food log entry not found")
    if log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return log

@router.put("/{log_id}", response_model=FoodLog)
def update_food_log(log_id: int, log_data: FoodLogUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    log = db.get(FoodLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Food log entry not found")
    if log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Update fields provided
    update_dict = log_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(log, key, value)
        
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_log(log_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    log = db.get(FoodLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Food log entry not found")
    if log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(log)
    db.commit()
    return None
