from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from bson import ObjectId
from datetime import datetime
from app.core.database import db
from app.services.llm import analyze_text_report
from app.services.vision import analyze_medical_image
from app.services.extractor import extract_text_from_pdf, extract_text_from_image
import json

print("REPORT ROUTER LOADED SUCCESSFULLY")

router = APIRouter(prefix="/report", tags=["Medical AI"])


# ---------------------------------------------------------
# Test Route (Keep This For Debugging)
# ---------------------------------------------------------
@router.get("/test")
def test_report():
    return {"message": "Report route working"}


# ---------------------------------------------------------
# Main Analyze Route
# ---------------------------------------------------------
@router.post("/analyze")
async def analyze_report(
    user_id: str = Form(...),
    modality: str = Form(...),  # lab | xray | mri
    file: UploadFile = File(...)
):
    try:
        # Validate ObjectId format first
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user_id format")

        # Check if user exists
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        file_bytes = await file.read()

        # -------------------------------------------------
        # LAB REPORT (PDF or Image)
        # -------------------------------------------------
        if modality.lower() == "lab":

            if file.content_type == "application/pdf":
                extracted_text = extract_text_from_pdf(file_bytes)

            elif file.content_type.startswith("image/"):
                extracted_text = extract_text_from_image(file_bytes)

            else:
                raise HTTPException(status_code=400, detail="Unsupported lab file type")

            if not extracted_text or not extracted_text.strip():
                raise HTTPException(status_code=400, detail="Could not extract readable text from the uploaded report")

            analysis = analyze_text_report(extracted_text, modality)

        # -------------------------------------------------
        # XRAY / MRI (Image AI)
        # -------------------------------------------------
        elif modality.lower() in ["xray", "mri"]:

            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Only image files allowed for X-ray/MRI")

            raw_response = analyze_medical_image(file_bytes, modality)

            try:
                analysis = json.loads(raw_response)
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail="AI returned invalid JSON")

        else:
            raise HTTPException(status_code=400, detail="Invalid modality")

        # -------------------------------------------------
        # Save to Database
        # -------------------------------------------------
        report_data = {
            "user_id": ObjectId(user_id),
            "modality": modality,
            "file_name": file.filename,
            "file_type": file.content_type,
            "uploaded_at": datetime.utcnow(),
            "analysis": analysis
        }

        result = await db.reports.insert_one(report_data)

        return {
            "report_id": str(result.inserted_id),
            "analysis": analysis
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
