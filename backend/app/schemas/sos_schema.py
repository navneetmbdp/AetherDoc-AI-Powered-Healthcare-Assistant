from pydantic import BaseModel


class SOSRequest(BaseModel):
    phone_number: str
    latitude: float
    longitude: float