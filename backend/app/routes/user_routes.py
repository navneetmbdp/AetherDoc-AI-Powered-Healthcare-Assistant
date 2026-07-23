from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from app.core.database import user_collection
from app.schemas.user_schema import UserProfileUpdate

router = APIRouter(prefix="/users", tags=["Users"])


def _public_user(user: dict):
    user["_id"] = str(user["_id"])
    user.pop("hashed_password", None)
    return user

@router.get("/profile")
async def get_user_profile(email: str = Query(...)):
    user = await user_collection.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _public_user(user)


@router.put("/profile")
async def update_user_profile(data: UserProfileUpdate, email: str = Query(...)):
    user = await user_collection.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.dict()
    new_email = (update_data.get("email") or email).strip().lower()
    current_email = email.strip().lower()
    if new_email != current_email:
        existing = await user_collection.find_one({"email": new_email})
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
        update_data["email"] = new_email

    update_data["updated_at"] = datetime.utcnow()

    await user_collection.update_one(
        {"email": email},
        {"$set": update_data},
    )

    updated_user = await user_collection.find_one({"email": update_data.get("email", email)})
    return _public_user(updated_user)
