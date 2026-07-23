from datetime import datetime
from app.core.database import emergency_session_collection


async def create_emergency_session(session_id: str, avatar_symbol: str):
    now = datetime.utcnow()
    await emergency_session_collection.update_one(
        {"session_id": session_id},
        {
            "$setOnInsert": {
                "session_id": session_id,
                "avatar_symbol": avatar_symbol,
                "messages": [],
                "created_at": now,
            },
            "$set": {
                "avatar_symbol": avatar_symbol,
                "updated_at": now,
            },
        },
        upsert=True,
    )


async def save_emergency_message(session_id: str, role: str, content: str, metadata: dict | None = None):
    await emergency_session_collection.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "metadata": metadata or {},
                    "timestamp": datetime.utcnow()
                }
            },
            "$set": {"updated_at": datetime.utcnow()},
            "$setOnInsert": {
                "session_id": session_id,
                "avatar_symbol": "Gemini Rescue",
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )


async def get_emergency_session_history(session_id: str, limit: int = 12) -> list[dict]:
    session = await emergency_session_collection.find_one(
        {"session_id": session_id},
        {"messages": {"$slice": -max(limit, 1)}},
    )
    if not session:
        return []
    return session.get("messages", [])


async def save_emergency_analysis(
    session_id: str,
    analysis_type: str,
    content: str,
    analysis_payload: dict | None = None,
):
    await save_emergency_message(
        session_id=session_id,
        role=analysis_type,
        content=content,
        metadata={"analysis": analysis_payload or {}},
    )


async def update_emergency_snapshot(session_id: str, data: dict):
    await emergency_session_collection.update_one(
        {"session_id": session_id},
        {
            "$set": {**data, "updated_at": datetime.utcnow()},
            "$setOnInsert": {
                "session_id": session_id,
                "avatar_symbol": "Gemini Rescue",
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )
