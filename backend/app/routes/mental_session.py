from fastapi import APIRouter, HTTPException
from bson import ObjectId
from uuid import uuid4
from datetime import datetime
from app.core.database import db

router = APIRouter(prefix="/mental-session", tags=["Mental Health"])

@router.post("/start/{user_id}")
async def start_session(user_id: str):
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session = {
        "session_id": str(uuid4()),
        "user_id": user_id,
        "risk_level": "low",
        "session_goal": None,
        "started_at": datetime.utcnow(),
        "ended_at": None,
        "messages": []   # 👈 IMPORTANT
    }

    await db.mental_sessions.insert_one(session)

    return {
        "session_id": session["session_id"],
        "user_id": user_id,
        "risk_level": session["risk_level"],
        "started_at": session["started_at"]
    }