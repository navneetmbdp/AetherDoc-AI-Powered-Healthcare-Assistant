from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.database import db, activity_collection, user_collection

router = APIRouter(prefix="/history", tags=["History"])


class ActivityLogRequest(BaseModel):
    email: str = Field(min_length=3)
    activity_type: str = "App Activity"
    title: str = Field(min_length=1)
    summary: str = ""
    status: str = "completed"
    metadata: dict[str, Any] = Field(default_factory=dict)


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return datetime.utcnow().isoformat()


def _duration_from_messages(messages: list[dict[str, Any]]) -> str:
    if len(messages) < 2:
        return "1 min"
    timestamps = [m.get("timestamp") or m.get("created_at") for m in messages if m.get("timestamp") or m.get("created_at")]
    if len(timestamps) < 2:
        return f"{max(1, len(messages))} turns"
    seconds = max(60, int((max(timestamps) - min(timestamps)).total_seconds()))
    minutes = max(1, round(seconds / 60))
    return f"{minutes} min"


def _item(
    *,
    item_id: str,
    activity_type: str,
    title: str,
    summary: str,
    occurred_at: Any,
    duration: str = "1 min",
    status: str = "completed",
    has_report: bool = False,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": item_id,
        "type": activity_type,
        "title": title,
        "summary": summary,
        "occurred_at": _iso(occurred_at),
        "duration": duration,
        "status": status,
        "has_report": has_report,
        "metadata": metadata or {},
    }


async def _user_for_email(email: str) -> dict[str, Any] | None:
    return await user_collection.find_one({"email": email.strip().lower()})


@router.post("/activity")
async def log_activity(payload: ActivityLogRequest):
    now = datetime.utcnow()
    document = payload.dict()
    document["email"] = document["email"].strip().lower()
    document["created_at"] = now
    result = await activity_collection.insert_one(document)
    return {"id": str(result.inserted_id), "created_at": now}


@router.get("/sessions")
async def get_history_sessions(
    email: str = Query(...),
    activity_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    normalized_email = email.strip().lower()
    user = await _user_for_email(normalized_email)
    user_object_id = user.get("_id") if user else None
    user_id = str(user_object_id) if user_object_id else None

    items: list[dict[str, Any]] = []

    async for activity in activity_collection.find({"email": normalized_email}).sort("created_at", -1).limit(limit):
        items.append(
            _item(
                item_id=str(activity["_id"]),
                activity_type=activity.get("activity_type", "App Activity"),
                title=activity.get("title", "App Activity"),
                summary=activity.get("summary") or "Patient used AetherDoc.",
                occurred_at=activity.get("created_at"),
                duration="1 min",
                status=activity.get("status", "completed"),
                metadata=activity.get("metadata", {}),
            )
        )

    if user_object_id:
        async for report in db.reports.find({"user_id": user_object_id}).sort("uploaded_at", -1).limit(limit):
            analysis = report.get("analysis") or {}
            summary = analysis.get("ai_explanation") or f"Analyzed {report.get('modality', 'medical')} report."
            items.append(
                _item(
                    item_id=str(report["_id"]),
                    activity_type="Report Analysis",
                    title=f"{str(report.get('modality', 'Medical')).title()} Report",
                    summary=summary,
                    occurred_at=report.get("uploaded_at"),
                    duration="5 min",
                    status="completed",
                    has_report=True,
                    metadata={
                        "file_name": report.get("file_name"),
                        "risk_level": analysis.get("risk_level"),
                        "report_id": str(report["_id"]),
                    },
                )
            )

        async for session in db.mental_sessions.find({"user_id": user_id}).sort("started_at", -1).limit(limit):
            messages = session.get("messages", [])
            latest = next((m for m in reversed(messages) if m.get("role") == "assistant"), None)
            items.append(
                _item(
                    item_id=session.get("session_id") or str(session["_id"]),
                    activity_type="Mental Health",
                    title="Mental Health Session",
                    summary=(latest or {}).get("content") or "Patient started a mental health support session.",
                    occurred_at=session.get("started_at"),
                    duration=_duration_from_messages(messages),
                    status="completed" if session.get("ended_at") else "active",
                    metadata={
                        "risk_level": session.get("risk_level"),
                        "message_count": len(messages),
                    },
                )
            )

    consultation_filter: dict[str, Any] = {"user_email": normalized_email}
    if user_id:
        consultation_filter = {"$or": [{"user_email": normalized_email}, {"user_id": user_id}]}
    async for session in db.consultation_sessions.find(consultation_filter).sort("created_at", -1).limit(limit):
        messages = session.get("messages", [])
        latest = next((m for m in reversed(messages) if m.get("role") == "assistant"), None)
        items.append(
            _item(
                item_id=session.get("session_id") or str(session["_id"]),
                activity_type="AI Consultation",
                title=session.get("specialty") or "AI Consultation",
                summary=(latest or {}).get("content") or f"Consultation with {session.get('doctor_name', 'AI doctor')}.",
                occurred_at=session.get("created_at"),
                duration=_duration_from_messages(messages),
                status="completed",
                has_report=bool(session.get("attachments")),
                metadata={
                    "doctor_name": session.get("doctor_name"),
                    "specialty": session.get("specialty"),
                    "message_count": len(messages),
                    "attachment_count": len(session.get("attachments", [])),
                },
            )
        )

    emergency_filter: dict[str, Any] = {"user_email": normalized_email}
    async for session in db.emergency_sessions.find(emergency_filter).sort("created_at", -1).limit(limit):
        messages = session.get("messages", [])
        items.append(
            _item(
                item_id=session.get("session_id") or str(session["_id"]),
                activity_type="Emergency Help",
                title=f"{str(session.get('emergency_type') or 'Emergency').title()} Assistance",
                summary=session.get("summary") or "Patient used emergency assistance.",
                occurred_at=session.get("created_at") or session.get("updated_at"),
                duration=_duration_from_messages(messages),
                status=session.get("risk_level") or "completed",
                metadata={
                    "risk_level": session.get("risk_level"),
                    "message_count": len(messages),
                    "notify_result": session.get("notify_result"),
                },
            )
        )

    if activity_type and activity_type != "all":
        items = [item for item in items if item["type"] == activity_type]

    items.sort(key=lambda item: item["occurred_at"], reverse=True)
    items = items[:limit]

    stats = {
        "consultations": sum(1 for item in items if item["type"] == "AI Consultation"),
        "reports": sum(1 for item in items if item["type"] == "Report Analysis"),
        "mental": sum(1 for item in items if item["type"] == "Mental Health"),
        "emergency": sum(1 for item in items if item["type"] == "Emergency Help"),
        "activities": sum(1 for item in items if item["type"] == "App Activity"),
        "total": len(items),
    }

    return {"items": items, "stats": stats}
