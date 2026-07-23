from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from bson import ObjectId
from datetime import datetime
from app.core.database import db
from app.services.llm import analyze_report
from app.models.report_model import report_serializer

router = APIRouter(prefix="report", tags=["Medical Reports"])