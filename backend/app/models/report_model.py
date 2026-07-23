from bson import ObjectId
from datetime import datetime

def report_serializer(report) -> dict:
    return{
        "id": str(report["_id"]),
        "user_id": str(report["user_id"]),
        "report_type": report["report_type"],
        "title": report["title"],
        "file_name": report["file_name"],
        "file_type": report["file_type"],
        "uploaded_at": report["uploaded_at"],
        "status": report["status"],
        "structured_values": report.get("structured_values", []),
        "ai_explanation": report.get("ai_explanation"),
        "risk_level": report.get("risk_level")

    }