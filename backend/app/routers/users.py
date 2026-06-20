from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.models import User
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])

# Pydantic schemas for request validation
class UserCreate(BaseModel):
    username: str
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    activity_level: str
    goal: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None

# Helper to calculate daily caloric and macro targets
def calculate_targets(weight_kg: float, height_cm: float, age: int, gender: str, activity_level: str, goal: str):
    # 1. Calculate BMR (Mifflin-St Jeor)
    if gender.lower() == "male":
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    elif gender.lower() == "female":
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
    else:
        # Default to neutral average BMR formula
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 78
        
    # 2. Activity Multiplier
    multipliers = {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    multiplier = multipliers.get(activity_level.lower(), 1.2)
    tdee = bmr * multiplier
    
    # 3. Adjust Calorie Goal
    if goal.lower() == "lose_weight":
        target_calories = int(tdee - 500)
    elif goal.lower() == "gain_weight":
        target_calories = int(tdee + 400)
    else:  # maintain
        target_calories = int(tdee)
        
    # Ensure calories don't drop below safety threshold (e.g. 1200)
    target_calories = max(target_calories, 1200)
    
    # 4. Calculate Macros
    # Protein: 2.0g per kg of bodyweight
    protein_grams = round(weight_kg * 2.0, 1)
    protein_calories = protein_grams * 4
    
    # Fat: 25% of total calorie target
    fat_calories = target_calories * 0.25
    fat_grams = round(fat_calories / 9, 1)
    
    # Carbs: Remaining calories
    carb_calories = target_calories - (protein_calories + fat_calories)
    carb_grams = round(max(carb_calories / 4, 0), 1)
    
    return {
        "target_calories": target_calories,
        "target_protein": protein_grams,
        "target_carbs": carb_grams,
        "target_fat": fat_grams
    }

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_session)):
    # Check if username already exists
    existing_user = db.exec(select(User).where(User.username == user_data.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    # Calculate targets
    targets = calculate_targets(
        weight_kg=user_data.weight_kg,
        height_cm=user_data.height_cm,
        age=user_data.age,
        gender=user_data.gender,
        activity_level=user_data.activity_level,
        goal=user_data.goal
    )
    
    # Create database object
    new_user = User(
        username=user_data.username,
        age=user_data.age,
        gender=user_data.gender,
        weight_kg=user_data.weight_kg,
        height_cm=user_data.height_cm,
        activity_level=user_data.activity_level,
        goal=user_data.goal,
        **targets
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/", response_model=List[User])
def get_users(db: Session = Depends(get_session)):
    return db.exec(select(User)).all()

@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    return user

@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    # Update fields provided in request
    update_dict = user_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)
        
    # Recalculate targets using updated (or existing) profile data
    targets = calculate_targets(
        weight_kg=user.weight_kg,
        height_cm=user.height_cm,
        age=user.age,
        gender=user.gender,
        activity_level=user.activity_level,
        goal=user.goal
    )
    for key, value in targets.items():
        setattr(user, key, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    db.delete(user)
    db.commit()
    return None
