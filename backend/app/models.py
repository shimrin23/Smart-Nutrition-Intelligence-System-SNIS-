from typing import Optional, List
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, nullable=False)
    email: Optional[str] = Field(default=None, index=True, unique=True, nullable=True)
    display_name: Optional[str] = Field(default=None, nullable=True)
    age: int
    gender: str  # male, female, other
    weight_kg: float
    height_cm: float
    activity_level: str  # sedentary, lightly_active, moderately_active, active, very_active
    goal: str  # lose_weight, maintain, gain_weight
    password: Optional[str] = Field(default=None, nullable=True)
    
    # Email verification fields
    is_verified: bool = Field(default=False)
    verification_token: Optional[str] = Field(default=None, nullable=True)
    reset_token: Optional[str] = Field(default=None, nullable=True)
    reset_token_expiry: Optional[datetime] = Field(default=None, nullable=True)
    
    # Calculated nutrition targets
    target_calories: int
    target_protein: float
    target_carbs: float
    target_fat: float
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship to FoodLog entries (deleting user deletes logs)
    food_logs: List["FoodLog"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class FoodLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    food_name: str = Field(nullable=False)
    quantity: float
    unit: str  # grams, cups, pieces
    
    # Macronutrients
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = Field(default=0.0)
    
    # Micronutrients
    iron: float = Field(default=0.0)
    calcium: float = Field(default=0.0)
    sodium: float = Field(default=0.0)
    
    # Image uploaded path
    image_path: Optional[str] = Field(default=None)
    
    # Relationship back to User
    user: Optional[User] = Relationship(back_populates="food_logs")

class FoodCache(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query_string: str = Field(index=True, unique=True, nullable=False)
    
    food_name: str
    quantity: float
    unit: str
    
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = Field(default=0.0)
    iron: float = Field(default=0.0)
    calcium: float = Field(default=0.0)
    sodium: float = Field(default=0.0)
    
    source: str = Field(default="ai")
    created_at: datetime = Field(default_factory=datetime.utcnow)
