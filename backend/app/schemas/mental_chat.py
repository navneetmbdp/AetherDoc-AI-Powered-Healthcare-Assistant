from pydantic import BaseModel
from typing import Optional

class DetectedEmotion(BaseModel):
    emotion: Optional[str] = None
    confidence: Optional[float] = None


class MentalChatRequest(BaseModel):
    session_id: str
    user_message: str
    detected_emotion: Optional[DetectedEmotion] = None
    handsfree: bool = False
