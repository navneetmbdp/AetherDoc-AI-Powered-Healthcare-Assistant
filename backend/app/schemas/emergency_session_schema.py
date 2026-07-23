from datetime import datetime
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class EmergencySessionMessage(BaseModel):
    role: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None


# ----------------------------
# Location Schema
# ----------------------------

class EmergencyLocation(BaseModel):
    latitude: float
    longitude: float
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "US"
    address: Optional[str] = None


# ----------------------------
# Notification Result
# ----------------------------

class EmergencyNotifyResult(BaseModel):
    sent: bool
    recipients: Optional[List[str]] = None
    reason: Optional[str] = None


# ----------------------------
# Camera Frame Analysis
# ----------------------------

class EmergencyCameraAnalysis(BaseModel):
    observations: List[str] = Field(default_factory=list)
    possible_conditions: List[str] = Field(default_factory=list)
    severity_level: Optional[str] = None
    immediate_actions: List[str] = Field(default_factory=list)
    emergency_warning: Optional[str] = None
    disclaimer: Optional[str] = None
    error: Optional[str] = None


# ----------------------------
# Video Analysis
# ----------------------------

class EmergencyVideoAnalysis(BaseModel):
    emotion_label: Optional[str] = None
    audio_present: Optional[bool] = None
    detections: Optional[Dict[str, Any]] = None


# ----------------------------
# Audio Upload Analysis
# ----------------------------

class EmergencyAudioAnalysis(BaseModel):
    emotion: Optional[str] = None
    transcript: Optional[str] = None
    acoustic_features: Optional[Dict[str, Any]] = None


# ----------------------------
# Main Emergency Session Response
# ----------------------------

class EmergencySessionResponse(BaseModel):

    # Core Session Info
    session_id: str
    avatar_symbol: str

    # AI Emergency Response
    emergency_type: Optional[str] = None
    risk_level: Optional[str] = None
    summary: Optional[str] = None
    immediate_steps: List[str] = Field(default_factory=list)
    do_not_do: List[str] = Field(default_factory=list)
    local_help: Optional[str] = None
    notify_loved_ones: bool = False
    monitor_signs: List[str] = Field(default_factory=list)

    # Tutorials
    tutorial_videos: List[Dict[str, Any]] = Field(default_factory=list)

    # Notifications
    notify_result: Optional[EmergencyNotifyResult] = None

    # Location Context
    location: Optional[EmergencyLocation] = None

    # Emotion Detection
    emotion_label: Optional[str] = None

    # Voice Assist
    transcript: Optional[str] = None
    tts_audio_base64: Optional[str] = None
    tts_error: Optional[str] = None

    # Camera Frame Analysis
    camera_analysis: Optional[EmergencyCameraAnalysis] = None

    # Video Analysis
    video_analysis: Optional[EmergencyVideoAnalysis] = None

    # Audio Upload Analysis
    audio_analysis: Optional[EmergencyAudioAnalysis] = None

    # System Info
    ai_error: Optional[str] = None
    status: Optional[str] = None

    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    messages: List[EmergencySessionMessage] = Field(default_factory=list)

    class Config:
        orm_mode = True
