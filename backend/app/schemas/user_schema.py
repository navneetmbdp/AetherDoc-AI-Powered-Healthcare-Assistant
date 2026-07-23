from pydantic import BaseModel, EmailStr
from typing import List, Optional

# ----------------------------
# Emergency Contact
# ----------------------------
class EmergencyContact(BaseModel):
    name: str
    relation: str
    phone: str


# ----------------------------
# Signup Schema (Profile + Medical)
# ----------------------------
class UserSignup(BaseModel):
    # Auth
    email: EmailStr
    password: str

    # Basic Profile
    name: str
    phone: str
    date_of_birth: str   # YYYY-MM-DD
    location: str

    # Medical Info
    blood_type: Optional[str] = None
    allergies: List[str] = []
    medications: List[str] = []
    conditions: List[str] = []

    # Emergency
    emergency_contact: EmergencyContact


class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: str
    phone: str
    date_of_birth: str
    location: str
    blood_type: Optional[str] = None
    allergies: List[str] = []
    medications: List[str] = []
    conditions: List[str] = []
    emergency_contact: EmergencyContact


# ----------------------------
# Login Schema
# ----------------------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ----------------------------
# Token Response
# ----------------------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
