import pdfplumber
import pytesseract
from PIL import Image
import io
import google.generativeai as genai

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
ocr_model = genai.GenerativeModel("gemini-flash-latest")

def extract_text_from_pdf(file_bytes):
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


def _extract_text_from_image_with_gemini(file_bytes):
    image = Image.open(io.BytesIO(file_bytes))
    prompt = """
Extract all visible medical report text from this image.
Return plain text only.
- Preserve numbers, units, table rows, and headings where possible.
- Do not explain or summarize.
- Do not return markdown.
"""
    response = ocr_model.generate_content([prompt, image])
    return (getattr(response, "text", "") or "").strip()


def extract_text_from_image(file_bytes):
    image = Image.open(io.BytesIO(file_bytes))
    try:
        extracted = pytesseract.image_to_string(image).strip()
        if extracted:
            return extracted
    except pytesseract.TesseractNotFoundError:
        pass
    except Exception:
        pass
    return _extract_text_from_image_with_gemini(file_bytes)
