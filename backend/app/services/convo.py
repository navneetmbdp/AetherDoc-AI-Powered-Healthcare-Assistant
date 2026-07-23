import os
from dotenv import load_dotenv
import google.generativeai as genai
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = genai.GenerativeModel("gemini-flash-latest")

def generate_response(prompt: str) -> str:
    response = MODEL.generate_content(
        prompt,
        generation_config={
            "temperature": 0.3,
            "max_output_tokens": 800,
        }
    )
    return response.text.strip()