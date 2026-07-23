from __future__ import annotations

from typing import Any

import google.generativeai as genai
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.consultation import (
    create_consultation_session,
    get_consultation_session,
    save_consultation_attachment,
    save_consultation_message,
)
from app.services.allDoc import build_specialist_prompt, get_specialists
from app.services.gemini_service import GeminiMedicalService

router = APIRouter(prefix="/consultation", tags=["Consultation"])

genai.configure(api_key=settings.GEMINI_API_KEY)
consultation_model = genai.GenerativeModel("gemini-flash-latest")


class ConsultationMessage(BaseModel):
    role: str
    content: str


class ConsultationChatRequest(BaseModel):
    session_id: str = Field(min_length=1)
    doctor_id: str = Field(min_length=1)
    user_message: str = Field(min_length=1)
    patient_data: dict[str, Any] = Field(default_factory=dict)


class ConsultationStartRequest(BaseModel):
    doctor_id: str = Field(min_length=1)
    user_email: str | None = None
    user_id: str | None = None


def _format_history(session: dict) -> str:
    messages = session.get("messages", [])[-12:]
    history_lines = [f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages]

    attachments = session.get("attachments", [])[-3:]
    for attachment in attachments:
        analysis = attachment.get("analysis", {})
        summary = " | ".join(analysis.get("simple_summary", [])[:2])
        findings = " | ".join(analysis.get("clinical_findings", [])[:3])
        history_lines.append(
            f"attachment-analysis: {attachment.get('file_name', 'image')} | summary={summary} | findings={findings}"
        )

    return "\n".join([line for line in history_lines if line.strip()])


@router.get("/specialists")
async def consultation_specialists():
    return {"specialists": get_specialists()}


@router.post("/start")
async def consultation_start(payload: ConsultationStartRequest):
    specialist = next((item for item in get_specialists() if item["id"] == payload.doctor_id), None)
    if not specialist:
        raise HTTPException(status_code=404, detail="Specialist not found")

    session = await create_consultation_session(
        doctor_id=specialist["id"],
        doctor_name=specialist["name"],
        specialty=specialist["specialty"],
        user_email=(payload.user_email or "").strip().lower() or None,
        user_id=payload.user_id,
    )

    greeting = (
        f"Hello, I am {specialist['name']}, your {specialist['specialty']}. "
        "Please describe your symptoms, and you may also upload a medical image if it helps."
    )
    await save_consultation_message(session["session_id"], "assistant", greeting)

    return {
        "session_id": session["session_id"],
        "doctor": specialist,
        "messages": [{"role": "assistant", "content": greeting}],
    }


@router.post("/chat")
async def consultation_chat(payload: ConsultationChatRequest):
    try:
        session = await get_consultation_session(payload.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Consultation session not found")

        specialist_prompt = build_specialist_prompt(session.get("doctor_id") or payload.doctor_id, payload.patient_data)
        history_text = _format_history(session)
        await save_consultation_message(
            payload.session_id,
            "user",
            payload.user_message,
            {"patient_data": payload.patient_data},
        )
        prompt = f"""
{specialist_prompt}

Conversation history:
{history_text or "No previous conversation."}

Latest patient message:
{payload.user_message}

Instructions:
- Stay in the selected specialist role.
- Reply like a genuine doctor chatting with the patient.
- Keep tone clear, caring, and natural.
- Give concise, actionable medical guidance.
- Do not use headings, markdown, or tables.
- Do not add any disclaimer block at the end.
- When an image analysis exists, use it as supporting context in the conversation.
- If symptoms indicate emergency, instruct immediate emergency care.
"""
        response = consultation_model.generate_content(prompt)
        text = getattr(response, "text", "").strip()
        if not text:
            raise ValueError("Empty response from consultation model")
        await save_consultation_message(payload.session_id, "assistant", text)
        return {"reply": text}
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(
            status_code=500,
            detail=f"Consultation failed: {exc}",
        )


@router.post("/session/{session_id}/attachment")
async def consultation_attachment(session_id: str, file: UploadFile = File(...)):
    session = await get_consultation_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Consultation session not found")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image attachments are supported")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        service = GeminiMedicalService()
        analysis = await service.analyze_medical_image(contents, file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Attachment analysis failed: {exc}")

    await save_consultation_attachment(session_id, file.filename or "attachment", file.content_type, analysis)

    attachment_note = (
        f"Patient uploaded image: {file.filename or 'attachment'}. "
        f"Summary: {' '.join(analysis.get('simple_summary', [])[:2])}"
    )
    await save_consultation_message(
        session_id,
        "system",
        attachment_note,
        {"attachment_analysis": analysis, "file_name": file.filename or "attachment"},
    )

    return {"analysis": analysis}
