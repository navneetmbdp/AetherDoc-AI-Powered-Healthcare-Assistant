from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

# -------------------------
# Password hashing
# -------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    # bcrypt max = 72 bytes
    password_bytes = password.encode("utf-8")
    safe_password = password_bytes[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(safe_password)

def verify_password(password: str, hashed: str) -> bool:
    password_bytes = password.encode("utf-8")
    safe_password = password_bytes[:72].decode("utf-8", errors="ignore")
    return pwd_context.verify(safe_password, hashed)

# -------------------------
# JWT creation
# -------------------------
def create_access_token(data: dict, expires_minutes: int = 60):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

# -------------------------
# JWT verification (NEW)
# -------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user_email(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        email: str | None = payload.get("sub")

        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        return email

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid",
        )
