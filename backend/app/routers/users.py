from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_session
from app.models import User
from app.config import settings
from pydantic import BaseModel, EmailStr
import hashlib
import secrets
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import resend
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

router = APIRouter(prefix="/users", tags=["Users"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str
    password: str
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    activity_level: str
    goal: str

class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GoogleLoginRequest(BaseModel):
    credential: str  # The Google ID token from the frontend

class UserUpdate(BaseModel):
    username: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None

# Keep backwards-compat schema for old username-based creation
class UserCreate(BaseModel):
    username: str
    password: Optional[str] = None
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    activity_level: str
    goal: str


# ─── Utilities ────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def email_to_display_name(email: str) -> str:
    """Extract prefix from email: 'shimrin' from 'shimrin@gmail.com'"""
    return email.split("@")[0]

def send_email_background(to_email: str, subject: str, html_body: str):
    """Send email via Resend API (SMTP is blocked on Railway)."""
    print(f"[*] Sending email to {to_email} via Resend API")
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        })
        print(f"[+] Email sent via Resend to {to_email} from {settings.MAIL_FROM}")
    except Exception as e:
        print(f"[-] Resend failed for {to_email}: {e}")

def send_verification_email(background_tasks: BackgroundTasks, to_email: str, token: str):
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6366f1; font-size: 28px; margin: 0;">🧬 SNIS AI</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Smart Nutrition Intelligence System</p>
      </div>
      <h2 style="color: #e2e8f0; font-size: 20px;">Verify your email address</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        Thank you for signing up! Click the button below to verify your email and activate your account.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{verify_url}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
          ✅ Verify My Email
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">
        If you didn't create this account, you can safely ignore this email.<br>
        This link expires in 24 hours.
      </p>
    </div>
    """
    background_tasks.add_task(send_email_background, to_email, "Verify your SNIS AI account", html)

def send_reset_email(background_tasks: BackgroundTasks, to_email: str, token: str):
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #6366f1; font-size: 28px; margin: 0;">🧬 SNIS AI</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Smart Nutrition Intelligence System</p>
      </div>
      <h2 style="color: #e2e8f0; font-size: 20px;">Reset your password</h2>
      <p style="color: #94a3b8; line-height: 1.6;">
        We received a request to reset your password. Click the button below to set a new one.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{reset_url}" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
          🔑 Reset My Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">
        This link expires in 1 hour. If you didn't request this, please ignore this email.
      </p>
    </div>
    """
    background_tasks.add_task(send_email_background, to_email, "Reset your SNIS AI password", html)


# ─── Target Calculator ────────────────────────────────────────────────────────

def calculate_targets(weight_kg, height_cm, age, gender, activity_level, goal):
    if gender.lower() == "male":
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    elif gender.lower() == "female":
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
    else:
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 78

    multipliers = {
        "sedentary": 1.2, "lightly_active": 1.375,
        "moderately_active": 1.55, "active": 1.725, "very_active": 1.9
    }
    tdee = bmr * multipliers.get(activity_level.lower(), 1.2)

    if goal.lower() == "lose_weight":
        target_calories = int(tdee - 500)
    elif goal.lower() == "gain_weight":
        target_calories = int(tdee + 400)
    else:
        target_calories = int(tdee)

    target_calories = max(target_calories, 1200)
    protein_grams = round(weight_kg * 2.0, 1)
    fat_grams = round((target_calories * 0.25) / 9, 1)
    carb_grams = round(max((target_calories - (protein_grams * 4) - (fat_grams * 9)) / 4, 0), 1)

    return {
        "target_calories": target_calories,
        "target_protein": protein_grams,
        "target_carbs": carb_grams,
        "target_fat": fat_grams
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_session)):
    """Register with email + password. Sends verification email."""
    # Check if email already registered
    existing = db.exec(select(User).where(User.email == user_data.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    display_name = email_to_display_name(user_data.email)
    
    # Ensure username is unique to avoid IntegrityError on unique constraint
    unique_username = display_name
    counter = 1
    while db.exec(select(User).where(User.username == unique_username)).first() is not None:
        unique_username = f"{display_name}_{counter}"
        counter += 1

    targets = calculate_targets(
        user_data.weight_kg, user_data.height_cm,
        user_data.age, user_data.gender,
        user_data.activity_level, user_data.goal
    )

    token = generate_token()
    new_user = User(
        username=unique_username,
        email=user_data.email.lower(),
        display_name=display_name,
        password=hash_password(user_data.password),
        age=user_data.age,
        gender=user_data.gender,
        weight_kg=user_data.weight_kg,
        height_cm=user_data.height_cm,
        activity_level=user_data.activity_level,
        goal=user_data.goal,
        is_verified=False,
        verification_token=token,
        **targets
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email in background (non-blocking)
    send_verification_email(background_tasks, new_user.email, token)

    return new_user


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_session)):
    """Verify account by token from email link."""
    user = db.exec(select(User).where(User.verification_token == token)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user.is_verified = True
    user.verification_token = None
    db.add(user)
    db.commit()
    return {"message": "Email verified successfully! You can now log in."}


@router.post("/login", response_model=User)
def login_user(login_data: UserLogin, db: Session = Depends(get_session)):
    """Login with email + password."""
    user = db.exec(select(User).where(User.email == login_data.email.lower())).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not user.password or user.password != hash_password(login_data.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in. Check your inbox.")

    return user


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_session)):
    """Send password reset link to email."""
    user = db.exec(select(User).where(User.email == request.email.lower())).first()
    # Always return success (security: don't reveal if email exists)
    if user and user.is_verified:
        token = generate_token()
        user.reset_token = token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.add(user)
        db.commit()
        send_reset_email(background_tasks, user.email, token)
    return {"message": "If this email is registered, you will receive a password reset link shortly."}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_session)):
    """Reset password using token from email link."""
    user = db.exec(select(User).where(User.reset_token == request.token)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if user.reset_token_expiry and datetime.utcnow() > user.reset_token_expiry:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    user.password = hash_password(request.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.add(user)
    db.commit()
    return {"message": "Password reset successfully! You can now log in."}


@router.post("/google-login", response_model=User)
def google_login(request: GoogleLoginRequest, db: Session = Depends(get_session)):
    """Sign in / Register with Google OAuth ID Token."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google login is not configured on this server.")

    try:
        # Verify the Google ID token
        id_info = google_id_token.verify_oauth2_token(
            request.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    google_email = id_info.get("email", "").lower()
    google_name = id_info.get("name", "") or id_info.get("given_name", "")
    email_prefix = email_to_display_name(google_email)

    if not google_email:
        raise HTTPException(status_code=400, detail="Google account has no email address.")

    # Check if user already exists
    existing_user = db.exec(select(User).where(User.email == google_email)).first()
    if existing_user:
        # Existing user — mark as verified (in case they registered via email but not yet verified)
        if not existing_user.is_verified:
            existing_user.is_verified = True
            db.add(existing_user)
            db.commit()
            db.refresh(existing_user)
        return existing_user

    # New user — auto-register with default values
    # Use google_name as display_name if available, otherwise use email prefix
    display_name = google_name if google_name else email_prefix

    # Ensure unique username
    unique_username = email_prefix
    counter = 1
    while db.exec(select(User).where(User.username == unique_username)).first() is not None:
        unique_username = f"{email_prefix}_{counter}"
        counter += 1

    # Use default targets (can be updated via Goal Settings later)
    targets = calculate_targets(
        weight_kg=70.0,
        height_cm=170.0,
        age=25,
        gender="other",
        activity_level="moderately_active",
        goal="maintain"
    )

    new_user = User(
        username=unique_username,
        email=google_email,
        display_name=display_name,
        password=None,  # Google users have no password
        age=25,
        gender="other",
        weight_kg=70.0,
        height_cm=170.0,
        activity_level="moderately_active",
        goal="maintain",
        is_verified=True,  # Google already verified the email
        **targets
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/resend-verification")
def resend_verification(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_session)):
    """Resend the email verification link."""
    user = db.exec(select(User).where(User.email == request.email.lower())).first()
    if user and not user.is_verified:
        token = generate_token()
        user.verification_token = token
        db.add(user)
        db.commit()
        send_verification_email(background_tasks, user.email, token)
    return {"message": "If your email is registered and unverified, a new verification link has been sent."}


# ─── Legacy & Standard CRUD ───────────────────────────────────────────────────

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_session)):
    """Legacy: create user by username (kept for backward compatibility)."""
    existing_user = db.exec(select(User).where(User.username == user_data.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    targets = calculate_targets(
        user_data.weight_kg, user_data.height_cm,
        user_data.age, user_data.gender,
        user_data.activity_level, user_data.goal
    )
    new_user = User(
        username=user_data.username,
        display_name=user_data.username,
        password=hash_password(user_data.password) if user_data.password else None,
        age=user_data.age,
        gender=user_data.gender,
        weight_kg=user_data.weight_kg,
        height_cm=user_data.height_cm,
        activity_level=user_data.activity_level,
        goal=user_data.goal,
        is_verified=True,  # legacy users auto-verified
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

    update_dict = user_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)

    targets = calculate_targets(
        user.weight_kg, user.height_cm, user.age,
        user.gender, user.activity_level, user.goal
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
