from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

user_collection = db["users"]
emergency_session_collection = db["emergency_sessions"]
activity_collection = db["activity_history"]

