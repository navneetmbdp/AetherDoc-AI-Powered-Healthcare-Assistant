from __future__ import annotations

import base64
import json
import shutil
import smtplib
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
from uuid import uuid4

import google.generativeai as genai
import librosa
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from moviepy.editor import VideoFileClip
from pydantic import BaseModel, Field
from app.prompts.emergency_prompt import build_emergency_prompt
from app.models.emergency_session import (
    create_emergency_session,
    get_emergency_session_history,
    save_emergency_message,
    update_emergency_snapshot
)

from app.core.config import settings
from app.rescue_ai_models.audioToText import extract_acoustic_features, transcribe_wav
from app.rescue_ai_models.emotion_service import EmotionService
from app.rescue_ai_models.tutorial_links import get_tutorial_links
from app.rescue_ai_models.vision_service import VisionService

router = APIRouter(prefix="/rescue", tags=["Rescue AI"])

emotion_service = EmotionService()
vision_service = VisionService()
genai.configure(api_key=settings.GEMINI_API_KEY)
rescue_model = genai.GenerativeModel("gemini-flash-latest")

BASE_DIR = Path(__file__).resolve().parent.parent
RUNTIME_DIR = BASE_DIR / "rescue_runtime"
UPLOADS_DIR = RUNTIME_DIR / "uploaded_videos"
AUDIO_DIR = RUNTIME_DIR / "audio"
DETECTIONS_DIR = RUNTIME_DIR / "detections"
for directory in (UPLOADS_DIR, AUDIO_DIR, DETECTIONS_DIR):
    directory.mkdir(parents=True, exist_ok=True)

SEVERITY_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}
GEMINI_SYMBOL = "Gemini Rescue"

class LocationPayload(BaseModel):
    latitude: float
    longitude: float
    city: str | None = None
    state: str | None = None
    country: str = "US"
    address: str | None = None


class EmergencyAssistRequest(BaseModel):
    user_text: str = Field(min_length=1)
    user_email: str | None = None
    location: LocationPayload | None = None
    camera_findings: dict[str, Any] = Field(default_factory=dict)
    emotion_label: str | None = None
    loved_ones_emails: list[str] = Field(default_factory=list)
    auto_notify_loved_ones: bool = True


class CameraContextRequest(BaseModel):
    session_id: str | None = None
    analysis: dict[str, Any] = Field(default_factory=dict)


class TutorialVideoRequest(BaseModel):
    emergency_type: str = "general"
    context_text: str = ""
    limit: int = Field(default=1, ge=1, le=8)


def _safe_json(raw: str) -> dict[str, Any]:
    cleaned = (raw or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "emergency_type": "general",
            "risk_level": "medium",
            "summary": cleaned or "Emergency assistance response unavailable.",
            "immediate_steps": [
                "Move to a safe position.",
                "Call local emergency services immediately.",
                "Keep monitoring breathing and consciousness.",
            ],
            "do_not_do": ["Do not delay professional emergency help."],
            "local_help": "Call your local emergency number now.",
            "notify_loved_ones": True,
        }


def _country_emergency_number(country: str) -> str:
    code = (country or "US").upper()
    if code in {"US", "CA"}:
        return "911"
    if code in {"IN"}:
        return "112"
    if code in {"GB", "UK", "EU"}:
        return "112"
    return "local emergency number"


def _location_text(location: LocationPayload | None) -> str:
    if not location:
        return "Location not provided."
    pieces = [
        location.address,
        location.city,
        location.state,
        location.country,
        f"lat={location.latitude}",
        f"lon={location.longitude}",
    ]
    return ", ".join([p for p in pieces if p])


def _ensure_session(session_id: str | None = None) -> str:
    if session_id and session_id.strip():
        return session_id.strip()
    return str(uuid4())


def _active_session_id(session_id: str | None = None) -> str | None:
    if session_id and session_id.strip():
        return session_id.strip()
    return None


def _should_notify(ai_payload: dict[str, Any]) -> bool:
    risk = str(ai_payload.get("risk_level", "low")).lower()
    if SEVERITY_ORDER.get(risk, 1) >= SEVERITY_ORDER["high"]:
        return True
    return bool(ai_payload.get("notify_loved_ones", False))


def _build_prompt(
    user_text: str,
    history: list[str],
    session_id: str,
    location: LocationPayload | None,
    camera_findings: dict[str, Any],
    emotion_label: str | None,
) -> str:
    emergency_number = _country_emergency_number((location.country if location else "US"))
    return build_emergency_prompt(
        history=history,
        user_input=user_text,
        emergency_number=emergency_number,
        emotion_label=emotion_label,
        camera_findings=camera_findings,
        location_text=_location_text(location),
    )


def _summarize_history_message(message: dict[str, Any]) -> str:
    role = str(message.get("role", "system")).strip().lower() or "system"
    content = str(message.get("content", "")).strip()
    metadata = message.get("metadata") or {}

    if role == "user":
        return f"User: {content}"
    if role == "assistant":
        return f"Assistant: {content}"
    if role == "camera_analysis":
        return f"Camera analysis: {content or json.dumps(metadata.get('analysis', {}), ensure_ascii=True)}"
    if role == "video_analysis":
        return f"Video analysis: {content or json.dumps(metadata.get('analysis', {}), ensure_ascii=True)}"
    return f"{role.replace('_', ' ').title()}: {content or json.dumps(metadata, ensure_ascii=True)}"


async def _load_history_lines(session_id: str, limit: int = 12) -> list[str]:
    messages = await get_emergency_session_history(session_id, limit=limit)
    return [_summarize_history_message(message) for message in messages]


def _gmail_alert(recipients: list[str], location: LocationPayload | None, ai_payload: dict[str, Any]) -> dict[str, Any]:
    if not recipients:
        return {"sent": False, "status": "not_sent", "reason": "no recipients"}
    if not settings.SMTP_EMAIL or not settings.SMTP_APP_PASSWORD:
        return {"sent": False, "status": "not_sent", "reason": "missing SMTP_EMAIL/SMTP_APP_PASSWORD in .env"}

    subject = "AetherDoc Emergency Alert"
    maps_link = ""
    if location:
        maps_link = f"https://www.google.com/maps?q={location.latitude},{location.longitude}"
    body_lines = [
        "Emergency detected by AetherDoc Rescue.",
        "",
        f"Risk Level: {ai_payload.get('risk_level', 'unknown')}",
        f"Type: {ai_payload.get('emergency_type', 'general')}",
        f"Summary: {ai_payload.get('summary', '')}",
        f"Emotion Label: {ai_payload.get('emotion_label') or 'not provided'}",
        f"Location: {_location_text(location)}",
        f"Coordinates: {location.latitude}, {location.longitude}" if location else "Coordinates: not provided",
    ]
    if maps_link:
        body_lines.append(f"Map: {maps_link}")
    body = "\n".join(body_lines)
    message = f"Subject: {subject}\n\n{body}"

    sent_to: list[str] = []
    try:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_APP_PASSWORD)
            for email in recipients:
                server.sendmail(settings.SMTP_EMAIL, email, message)
                sent_to.append(email)
        return {"sent": True, "status": "sent", "recipients": sent_to, "reason": "email delivered"}
    except Exception as exc:
        return {"sent": False, "status": "failed", "reason": f"smtp error: {exc}"}


async def _run_assistant(session_id: str, payload: EmergencyAssistRequest) -> dict[str, Any]:
    history = await _load_history_lines(session_id)
    prompt = _build_prompt(
        user_text=payload.user_text,
        history=history,
        session_id=session_id,
        location=payload.location,
        camera_findings=payload.camera_findings,
        emotion_label=payload.emotion_label,
    )
    try:
        await save_emergency_message(
    session_id,
    "user",
    payload.user_text,
    {
        "emotion": payload.emotion_label,
        "location": payload.location.dict() if payload.location else None,
        "camera_findings": payload.camera_findings
    }
)
        response = rescue_model.generate_content(prompt)
        parsed = _safe_json(getattr(response, "text", ""))
        await save_emergency_message(
            session_id,
            "assistant",
            parsed.get("summary", ""),
            {
                "risk_level": parsed.get("risk_level"),
                "emergency_type": parsed.get("emergency_type"),
                "analysis": parsed,
            }
        )
    except Exception as exc:
        # Fail open so emergency flow continues even if LLM provider is unavailable.
        parsed = {
            "emergency_type": "general",
            "risk_level": "medium",
            "summary": "AI service is temporarily unavailable. Follow basic first-aid and contact emergency services now.",
            "immediate_steps": [
                "Move the person to a safe position.",
                "Call local emergency services immediately.",
                "Monitor breathing and consciousness continuously.",
            ],
            "do_not_do": ["Do not delay professional medical help."],
            "local_help": f"Call {_country_emergency_number((payload.location.country if payload.location else 'US'))}.",
            "notify_loved_ones": False,
            "monitor_signs": ["breathing", "consciousness", "bleeding"],
            "ai_error": str(exc),
        }
    try:
        tutorials = get_tutorial_links(
            parsed.get("emergency_type", "general"),
            context_text=f"{payload.user_text} {parsed.get('summary', '')}",
            youtube_api_key=settings.YOUTUBE_API_KEY,
        )
    except Exception:
        tutorials = []
    notify = _should_notify(parsed) and payload.auto_notify_loved_ones
    notify_result = {"sent": False, "reason": "not required"}
    if notify:
        notify_result = _gmail_alert(payload.loved_ones_emails, payload.location, parsed)


    await update_emergency_snapshot(session_id, {
    "user_email": (payload.user_email or "").strip().lower() or None,
    "emergency_type": parsed.get("emergency_type"),
    "risk_level": parsed.get("risk_level"),
    "summary": parsed.get("summary"),
    "immediate_steps": parsed.get("immediate_steps"),
    "do_not_do": parsed.get("do_not_do"),
    "local_help": parsed.get("local_help"),
    "notify_loved_ones": parsed.get("notify_loved_ones"),
    "monitor_signs": parsed.get("monitor_signs"),
    "tutorial_videos": tutorials,
    "notify_result": notify_result
})

    return {
        "session_id": session_id,
        "avatar_symbol": GEMINI_SYMBOL,
        **parsed,
        "tutorial_videos": tutorials,
        "notify_result": notify_result,
    }


@router.post("/upload")
async def upload_wav_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are allowed")

    wav_path = AUDIO_DIR / "temp_upload.wav"
    with wav_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        emotion = emotion_service.predict_emotion_from_wav(str(wav_path))
        audio_data, sample_rate = librosa.load(str(wav_path), sr=None)
        features = extract_acoustic_features(audio_data, sample_rate)
        transcript = transcribe_wav(str(wav_path))
        return {"emotion": emotion, "transcript": transcript, "acoustic_features": features}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/video")
async def upload_video(file: UploadFile = File(...), session_id: str | None = Form(None)):
    if not file.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only MP4 files are allowed")

    file_path = UPLOADS_DIR / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    audio_path = AUDIO_DIR / f"{file.filename}.wav"

    try:
        emotion = None
        audio_present = False

        clip = VideoFileClip(str(file_path))
        try:
            if clip.audio is not None:
                clip.audio.write_audiofile(str(audio_path), logger=None)
                audio_present = True
        finally:
            clip.close()

        if audio_present:
            emotion = emotion_service.predict_emotion_from_wav(str(audio_path))

        vision = vision_service.analyze_video(
            str(file_path),
            output_dir=str(DETECTIONS_DIR / file.filename),
            max_frames=200,
        )
        sid = _active_session_id(session_id)
        analysis_payload = {"emotion_label": emotion, "audio_present": audio_present, **vision}
        if sid:
            await update_emergency_snapshot(sid, {"video_analysis": analysis_payload, "emotion_label": emotion})

        return analysis_payload
    except Exception as exc:
        sid = _active_session_id(session_id)
        error_payload = {
            "emotion_label": None,
            "audio_present": False,
            "error": str(exc),
        }
        if sid:
            await update_emergency_snapshot(sid, {"video_analysis": error_payload})
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/emergency/session/start")
async def start_emergency_session():
    session_id = _ensure_session()

    await create_emergency_session(session_id, GEMINI_SYMBOL)

    return {
        "session_id": session_id,
        "avatar_symbol": GEMINI_SYMBOL
    }


@router.post("/emergency/assist")
async def emergency_assist_default(data: EmergencyAssistRequest):
    try:
        return await _run_assistant(_ensure_session(), data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Emergency assist failed: {exc}")


@router.post("/emergency/session/{session_id}/assist")
async def emergency_assist(session_id: str, data: EmergencyAssistRequest):
    try:
        return await _run_assistant(_ensure_session(session_id), data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Emergency assist failed: {exc}")


@router.websocket("/emergency/ws/{session_id}")
async def emergency_assist_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_session_id = _ensure_session(session_id)
    try:
        while True:
            raw_payload = await websocket.receive_json()
            try:
                payload = EmergencyAssistRequest(**raw_payload)
                response = await _run_assistant(active_session_id, payload)
                await websocket.send_json({"type": "assistant_response", "payload": response})
            except Exception as exc:
                await websocket.send_json({"type": "error", "message": f"Emergency assist failed: {exc}"})
    except WebSocketDisconnect:
        return


@router.post("/emergency/assist-voice")
@router.post("/emergency/session/{session_id}/assist-voice")
async def emergency_assist_voice(
    session_id: str | None = None,
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    country: str = Form("US"),
    city: str | None = Form(None),
    state: str | None = Form(None),
    address: str | None = Form(None),
    loved_ones_emails: str = Form(""),
):
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are allowed for voice assist")

    with NamedTemporaryFile(dir=AUDIO_DIR, suffix=".wav", delete=False) as temp:
        shutil.copyfileobj(file.file, temp)
        temp_path = Path(temp.name)

    try:
        active_session_id = _ensure_session(session_id)
        transcript = transcribe_wav(str(temp_path)).strip()
        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")

        payload = EmergencyAssistRequest(
            user_text=transcript,
            location=LocationPayload(
                latitude=latitude,
                longitude=longitude,
                country=country,
                city=city,
                state=state,
                address=address,
            ),
            loved_ones_emails=[e.strip() for e in loved_ones_emails.split(",") if e.strip()],
        )
        response_payload = await _run_assistant(active_session_id, payload)

        tts_base64 = None
        tts_error = None
        try:
            from gtts import gTTS

            speech_text = f"{response_payload.get('summary', '')}. Steps: {'; '.join(response_payload.get('immediate_steps', []))}"
            speech_file = AUDIO_DIR / f"{active_session_id}-reply.mp3"
            gTTS(text=speech_text, lang="en").save(str(speech_file))
            with speech_file.open("rb") as audio_fp:
                tts_base64 = base64.b64encode(audio_fp.read()).decode("utf-8")
        except Exception as exc:
            tts_error = str(exc)

        return {
            **response_payload,
            "transcript": transcript,
            "tts_audio_base64": tts_base64,
            "tts_error": tts_error,
        }
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)


@router.post("/emergency/camera-frame")
async def analyze_camera_frame(file: UploadFile = File(...), session_id: str | None = Form(None)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image frame uploads are supported")

    image_data = await file.read()
    prompt = """
You are an emergency scene detector for first aid support.
Analyze the image and return JSON only with this exact shape:
{
  "observations": ["short visual observations from image"],
  "possible_conditions": ["possible condition 1", "possible condition 2"],
  "severity_level": "low | moderate | high",
  "immediate_actions": ["action 1", "action 2"],
  "emergency_warning": "one concise warning, or empty string",
  "disclaimer": "visual analysis is not a confirmed diagnosis"
}
Do not return markdown.
"""
    try:
        response = rescue_model.generate_content([prompt, {"mime_type": file.content_type, "data": image_data}])
        parsed = _safe_json(getattr(response, "text", ""))
        sid = _active_session_id(session_id)
        if sid:
            await update_emergency_snapshot(sid, {"camera_analysis": parsed})
        return {"avatar_symbol": GEMINI_SYMBOL, **parsed}
    except Exception as exc:
        # Return safe fallback instead of 500 to keep real-time flow alive.
        fallback = {
            "avatar_symbol": GEMINI_SYMBOL,
            "observations": ["Unable to analyze scene right now."],
            "possible_conditions": ["general emergency"],
            "severity_level": "moderate",
            "immediate_actions": [
                "Check breathing and responsiveness.",
                "Look for active bleeding.",
                "Remove immediate hazards from surroundings.",
            ],
            "emergency_warning": "If symptoms worsen, call local emergency services now.",
            "disclaimer": "Visual analysis is supportive only and not a confirmed diagnosis.",
            "error": f"camera analysis unavailable: {exc}",
        }
        sid = _active_session_id(session_id)
        if sid:
            await update_emergency_snapshot(sid, {"camera_analysis": fallback})
        return fallback


@router.post("/emergency/camera-context")
async def push_camera_context(data: CameraContextRequest):
    sid = _active_session_id(data.session_id)
    if sid:
        await update_emergency_snapshot(sid, {"camera_analysis": data.analysis})
    return {"session_id": sid, "avatar_symbol": GEMINI_SYMBOL, "updated": bool(sid)}


@router.post("/emergency/tutorial-video")
async def emergency_tutorial_video(data: TutorialVideoRequest):
    tutorials = get_tutorial_links(
        data.emergency_type,
        context_text=data.context_text,
        limit=data.limit,
        youtube_api_key=settings.YOUTUBE_API_KEY,
    )
    return {
        "emergency_type": data.emergency_type,
        "tutorial_videos": tutorials,
    }


@router.post("/emergency/send-location-alert")
async def send_location_alert(data: EmergencyAssistRequest):
    if not data.location:
        raise HTTPException(status_code=400, detail="Location required")

    alert_payload = {
        "risk_level": "critical",
        "emergency_type": "manual alert",
        "summary": data.user_text or "User triggered manual emergency alert.",
        "emotion_label": data.emotion_label,
    }

    result = _gmail_alert(
        data.loved_ones_emails,
        data.location,
        alert_payload
    )

    if data.user_email:
        await update_emergency_snapshot("manual-alert-" + data.user_email.strip().lower(), {
            "user_email": data.user_email.strip().lower(),
            "emergency_type": "manual alert",
            "risk_level": "critical",
            "summary": alert_payload["summary"],
            "emotion_label": data.emotion_label,
            "location": data.location.dict(),
            "notify_result": result,
        })

    return {
        "status": result.get("status", "sent" if result.get("sent") else "not_sent"),
        "reason": result.get("reason"),
        "location": data.location.dict(),
        "emotion_label": data.emotion_label,
        "notify_result": result
    }
