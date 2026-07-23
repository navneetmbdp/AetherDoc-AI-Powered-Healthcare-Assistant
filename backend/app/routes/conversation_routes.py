from fastapi import APIRouter, UploadFile, File, Form
from app.services.stt_service import speech_to_text
from app.core.conversation_engine import handle_conversation
import uuid

router = APIRouter(prefix="/conversation", tags=["AI Conversation"])

@router.post("/voice")
async def voice_conversation(
    mode: str = Form(...),
    session_id: str = Form(None),
    file: UploadFile = File(...)
):
    if not session_id:
        session_id = str(uuid.uuid4())

    transcript = speech_to_text(file)

    result = handle_conversation(session_id, mode, transcript)

    result["transcript"] = transcript

    return result