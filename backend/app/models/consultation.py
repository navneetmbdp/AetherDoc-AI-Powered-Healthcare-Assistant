from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from app.core.database import db

consultation_session_collection = db["consultation_sessions"]


async def create_consultation_session(
    doctor_id: str,
    doctor_name: str,
    specialty: str,
    user_email: str | None = None,
    user_id: str | None = None,
) -> dict:
    now = datetime.utcnow()
    session = {
        "session_id": str(uuid4()),
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "specialty": specialty,
        "user_email": user_email,
        "user_id": user_id,
        "messages": [],
        "attachments": [],
        "created_at": now,
        "updated_at": now,
    }
    await consultation_session_collection.insert_one(session)
    return session


async def get_consultation_session(session_id: str) -> dict | None:
    return await consultation_session_collection.find_one({"session_id": session_id})


async def save_consultation_message(
    session_id: str,
    role: str,
    content: str,
    metadata: dict | None = None,
):
    await consultation_session_collection.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "metadata": metadata or {},
                    "timestamp": datetime.utcnow(),
                }
            },
            "$set": {"updated_at": datetime.utcnow()},
        },
    )


async def save_consultation_attachment(
    session_id: str,
    file_name: str,
    content_type: str,
    analysis: dict,
):
    await consultation_session_collection.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "attachments": {
                    "file_name": file_name,
                    "content_type": content_type,
                    "analysis": analysis,
                    "timestamp": datetime.utcnow(),
                }
            },
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
