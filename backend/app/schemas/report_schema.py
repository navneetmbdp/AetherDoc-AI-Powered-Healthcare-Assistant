from pydantic import BaseModel
from typing import List, Optional

class StructuredValue(BaseModel):
    name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None

class ReportResponse(BaseModel):
    title: str
    date: str
    value: List[StructuredValue]
    aiExplanation: Optional[str]