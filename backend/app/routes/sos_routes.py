from fastapi import APIRouter, HTTPException
from app.schemas.sos_schema import SOSRequest
from app.services.twilio_service import TwilioService

router = APIRouter(prefix="/sos", tags=["SOS"])

twilio_service = TwilioService()


@router.post("/send-sms")
async def send_sms(data: SOSRequest):
    try:
        sms_sid = twilio_service.send_sms(
            data.phone_number,
            data.latitude,
            data.longitude
        )
        return {"message": "SMS sent", "sid": sms_sid}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/make-call")
async def make_call(data: SOSRequest):
    try:
        call_sid = twilio_service.make_call(data.phone_number)
        return {"message": "Call initiated", "sid": call_sid}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger")
async def trigger_sos(data: SOSRequest):
    try:
        result = twilio_service.trigger_sos(
            data.phone_number,
            data.latitude,
            data.longitude
        )
        return {"message": "SOS triggered", **result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/call-primary")
async def call_primary_emergency():
    try:
        result = twilio_service.trigger_primary_emergency_contact()
        return {
            "message": "Primary emergency SMS and call initiated",
            "phone_number": twilio_service.PRIMARY_EMERGENCY_NUMBER,
            "sms_sid": result["sms_sid"],
            "call_sid": result["call_sid"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
