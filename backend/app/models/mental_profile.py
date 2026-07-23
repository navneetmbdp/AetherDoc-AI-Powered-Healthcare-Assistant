from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MentalProfile(BaseModel):
    user_id: str
    baseline_mood: Optional[str] = None
    known_triggers: List[str] = []
    coping_strategies: List[str] = []
    communication_style: str = "gentle"
    created_at: datetime = datetime.utcnow()
