from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

class SessionMessage(BaseModel):
    session_id: str
    role: str  # user | assistant
    content: str
    emotion_context: Optional[Dict] = None
    created_at: datetime = datetime.utcnow()
