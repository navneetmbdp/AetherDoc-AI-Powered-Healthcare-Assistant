from dotenv import load_dotenv
from pathlib import Path
import sys
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ==============================
# LOAD ENVIRONMENT VARIABLES
# ==============================

BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(ENV_PATH)

print("✅ .env loaded from:", ENV_PATH)
print("🔐 GEMINI KEY PRESENT:", bool(os.getenv("GEMINI_API_KEY")))

# ==============================
# FIX PYTHON PATH
# ==============================

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ==============================
# IMPORT ROUTERS
# ==============================

from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router
from app.routes.report import router as report_router
from app.routes import mental_chat, mental_session
from app.routes import medical_analysis
from app.routes import sos_routes
from app.routes import rescue_routes
from app.routes import history_routes
from app.routes import consultation_routes
from app.routes import conversation_routes   # ← if you created this

# ==============================
# CREATE APP
# ==============================

app = FastAPI(title="AetherDoc Backend")

# ==============================
# CORS
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# INCLUDE ROUTERS
# ==============================

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(mental_session.router)
app.include_router(mental_chat.router)
app.include_router(medical_analysis.router)
app.include_router(report_router)
app.include_router(sos_routes.router)
app.include_router(rescue_routes.router)
app.include_router(history_routes.router)
app.include_router(consultation_routes.router)

# If using new conversation engine route
try:
    app.include_router(conversation_routes.router)
except Exception:
    pass

# ==============================
# ROOT
# ==============================

@app.get("/")
def root():
    return {"status": "AetherDoc backend running"}
