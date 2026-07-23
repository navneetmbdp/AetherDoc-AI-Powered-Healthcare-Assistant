from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MentalHealthSession(BaseModel):
    session_id: str
    user_id: str
    session_goal: Optional[str] = None
    dominant_emotions: List[str] = []
    risk_level: str = "low"
    started_at: datetime = datetime.utcnow()
    ended_at: Optional[datetime] = None
