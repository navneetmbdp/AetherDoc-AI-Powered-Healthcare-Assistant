from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.gemini_service import GeminiMedicalService

router = APIRouter(prefix="/medical", tags=["Medical Analysis"])


def _route_fallback(error_text: str):
    return {
        "risk_level": "medium",
        "clinical_findings": ["Medical analysis service encountered an internal error."],
        "simple_summary": [
            "Image upload succeeded, but analysis engine failed this time.",
            "Please retry in a moment.",
            "Consult a licensed physician for urgent concerns.",
        ],
        "recommendations": [
            {"name": "Retry analysis", "dosage": "After 1-2 minutes", "duration": "Once"},
        ],
        "follow_up": "Retry with a clear image or seek direct medical consultation.",
        "red_flags": ["Severe pain", "Breathing difficulty", "Bleeding", "Loss of consciousness"],
        "disclaimer": "AI output is supportive only and not a final diagnosis.",
        "audio_base64": "",
        "raw_analysis": "",
        "service_status": "fallback",
        "error": error_text,
    }

@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max size is 25MB.")

    try:
        service = GeminiMedicalService()
        result = await service.analyze_medical_image(contents, file.content_type)
        return result
    except Exception as exc:
        return _route_fallback(str(exc))
