from app.core.database import user_collection
from app.core.security import hash_password, verify_password
from datetime import datetime

async def create_user(user_data: dict):
    password = user_data.pop("password")

    user_document = {
        **user_data,  # ✅ ALL profile & medical fields
        "hashed_password": hash_password(password),
        "role": "patient",
        "created_at": datetime.utcnow()
    }

    await user_collection.insert_one(user_document)


async def authenticate_user(email: str, password: str):
    user = await user_collection.find_one({"email": email})
    if not user:
        return None

    if not verify_password(password, user["hashed_password"]):
        return None

    return user
