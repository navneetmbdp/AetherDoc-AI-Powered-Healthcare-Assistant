from twilio.rest import Client

from app.core.config import settings


class TwilioService:
    PRIMARY_EMERGENCY_NUMBER = "9810112192"
    PRIMARY_EMERGENCY_MESSAGE = (
        "Priya is currently facing a serious medical emergency. Please reach her location immediately and stay with her until proper medical assistance is arranged. Your immediate support is urgently needed."
    )

    def __init__(self):
        self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        self.from_number = settings.TWILIO_PHONE_NUMBER

    def _normalize_phone_number(self, phone_number: str) -> str:
        raw = (phone_number or "").strip()
        digits = "".join(ch for ch in raw if ch.isdigit())

        if raw.startswith("+") and digits:
            return f"+{digits}"
        if len(digits) == 10:
            return f"+91{digits}"
        if len(digits) == 12 and digits.startswith("91"):
            return f"+{digits}"
        return raw

    def send_sms(self, phone_number: str, latitude: float, longitude: float):
        location_link = f"https://maps.google.com/?q={latitude},{longitude}"
        to_number = self._normalize_phone_number(phone_number)

        message = self.client.messages.create(
            body=f"EMERGENCY ALERT!\nLocation:\n{location_link}",
            from_=self.from_number,
            to=to_number,
        )
        return message.sid

    def make_call(self, phone_number: str):
        to_number = self._normalize_phone_number(phone_number)
        call = self.client.calls.create(
            to=to_number,
            from_=self.from_number,
            twiml="""
                <Response>
                    <Say voice="alice">
                        Emergency alert. Location details have been sent via SMS.
                        Please check immediately.
                    </Say>
                </Response>
            """,
        )
        return call.sid

    def call_primary_emergency_contact(self):
        to_number = self._normalize_phone_number(self.PRIMARY_EMERGENCY_NUMBER)
        call = self.client.calls.create(
            to=to_number,
            from_=self.from_number,
            twiml=f"""
                <Response>
                    <Say voice="alice">
                        {self.PRIMARY_EMERGENCY_MESSAGE}
                    </Say>
                </Response>
            """,
        )
        return call.sid

    def send_primary_emergency_sms(self):
        to_number = self._normalize_phone_number(self.PRIMARY_EMERGENCY_NUMBER)
        message = self.client.messages.create(
            body=self.PRIMARY_EMERGENCY_MESSAGE,
            from_=self.from_number,
            to=to_number,
        )
        return message.sid

    def trigger_primary_emergency_contact(self):
        sms_sid = self.send_primary_emergency_sms()
        call_sid = self.call_primary_emergency_contact()
        return {"sms_sid": sms_sid, "call_sid": call_sid}

    def trigger_sos(self, phone_number: str, latitude: float, longitude: float):
        sms_sid = self.send_sms(phone_number, latitude, longitude)
        call_sid = self.make_call(phone_number)

        return {"sms_sid": sms_sid, "call_sid": call_sid}
