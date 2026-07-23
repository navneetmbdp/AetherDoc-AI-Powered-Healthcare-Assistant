from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str
    JWT_SECRET: str
    GEMINI_API_KEY: str
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    GEMINI_API_KEY: str
    SMTP_EMAIL: str = ""
    SMTP_APP_PASSWORD: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    YOUTUBE_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8")

settings = Settings()
