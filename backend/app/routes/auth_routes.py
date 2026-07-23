from fastapi import APIRouter, HTTPException, Depends
from app.services.auth_service import create_user, authenticate_user
from app.core.database import user_collection
from app.core.security import create_access_token
from app.schemas.user_schema import UserSignup, UserLogin, TokenResponse
from app.core.security import get_current_user_email
from bson import ObjectId



router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
async def signup(user: UserSignup):
    existing = await user_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    await create_user(user.model_dump())

    return {
        "message": "User registered successfully",
        "profile_completed": True
    }

@router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await authenticate_user(user.email, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})
    return {"access_token": token}


