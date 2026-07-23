import json
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from app.core.database import db
from app.schemas.mental_chat import DetectedEmotion, MentalChatRequest
from app.services.llm import call_llm
from app.services.stt_service import speech_to_text
from app.services.tts_service import text_to_speech

router = APIRouter(prefix="/mental-chat", tags=["Mental Health"])


async def _run_mental_turn(
    session_id: str,
    user_message: str,
    detected_emotion: dict,
    include_tts: bool,
    mode: str,
):
    if not user_message.strip():
        raise HTTPException(status_code=400, detail="Empty user message")

    session = await db.mental_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Session has ended")

    user_id = session["user_id"]
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    patient_profile = {
        "name": user.get("name"),
        "conditions": user.get("conditions", []),
        "medications": user.get("medications", []),
    }

    history = [{"role": m["role"], "content": m["content"]} for m in session.get("messages", [])[-6:]]

    user_msg = {
        "role": "user",
        "content": user_message,
        "emotion": detected_emotion,
        "mode": mode,
        "created_at": datetime.utcnow(),
    }
    await db.mental_sessions.update_one({"session_id": session_id}, {"$push": {"messages": user_msg}})

    ai_reply = call_llm(
        profile=patient_profile,
        session=session,
        history=history,
        user_message=user_message,
        emotion=detected_emotion,
    )

    assistant_msg = {
        "role": "assistant",
        "content": ai_reply,
        "mode": mode,
        "created_at": datetime.utcnow(),
    }
    await db.mental_sessions.update_one({"session_id": session_id}, {"$push": {"messages": assistant_msg}})

    tts_audio_base64 = text_to_speech(ai_reply) if include_tts else ""
    return {"reply": ai_reply, "tts_audio_base64": tts_audio_base64}


@router.post("/message")
async def send_message(payload: MentalChatRequest):
    detected_emotion = payload.detected_emotion.dict(exclude_none=True) if payload.detected_emotion else {}
    return await _run_mental_turn(
        session_id=payload.session_id,
        user_message=payload.user_message,
        detected_emotion=detected_emotion,
        include_tts=bool(payload.handsfree),
        mode="text",
    )


@router.websocket("/ws/{session_id}")
async def mental_chat_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
      while True:
        raw_payload = await websocket.receive_json()
        try:
            detected = raw_payload.get("detected_emotion") or {}
            if detected:
                detected = DetectedEmotion(**detected).dict(exclude_none=True)
            response = await _run_mental_turn(
                session_id=session_id,
                user_message=raw_payload.get("user_message", ""),
                detected_emotion=detected,
                include_tts=bool(raw_payload.get("handsfree", False)),
                mode="socket",
            )
            await websocket.send_json({"type": "assistant_response", "payload": response})
        except Exception as exc:
            await websocket.send_json({"type": "error", "message": f"Mental health response failed: {exc}"})
    except WebSocketDisconnect:
        return


@router.post("/voice")
async def send_voice_message(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    detected_emotion: str = Form("{}"),
):
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are supported")

    transcript = speech_to_text(file)
    if not transcript:
        raise HTTPException(status_code=400, detail="Could not transcribe audio")

    try:
        emotion_data = json.loads(detected_emotion or "{}")
        detected = DetectedEmotion(**emotion_data).dict(exclude_none=True)
    except Exception:
        detected = {}

    result = await _run_mental_turn(
        session_id=session_id,
        user_message=transcript,
        detected_emotion=detected,
        include_tts=True,
        mode="voice",
    )
    return {"transcript": transcript, **result}
