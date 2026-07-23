import google.generativeai as genai
from app.core.config import settings
from PIL import Image
import io

genai.configure(api_key=settings.GEMINI_API_KEY)

vision_model = genai.GenerativeModel("gemini-flash-latest")

def analyze_medical_image(image_bytes: bytes, modality: str):
    image = Image.open(io.BytesIO(image_bytes))

    prompt = f"""
You are an AI radiology assistant.

STRICT RULES:
- Do NOT provide final diagnosis.
- Do NOT prescribe medication.
- Only describe visible abnormalities.
- Use simple language.
- If unclear, say "Not clearly visible".
- Always recommend consulting a radiologist.

Modality: {modality}

Return JSON only:

{{
  "findings": ["finding1", "finding2"],
  "impression": "summary in simple language",
  "risk_level": "low | medium | high"
}}
"""

    response = vision_model.generate_content([prompt, image])

    return response.text
