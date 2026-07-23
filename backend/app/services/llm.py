import time
import json
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from app.core.config import settings

# ---------------------------------------------------------
# Gemini Configuration
# ---------------------------------------------------------

genai.configure(api_key=settings.GEMINI_API_KEY)

medical_model = genai.GenerativeModel("gemini-flash-latest")
mental_health_model = genai.GenerativeModel("gemini-flash-latest")


# ---------------------------------------------------------
# Safe Gemini Call (with retry & backoff)
# ---------------------------------------------------------

def _call_gemini(model, prompt: str, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            response = model.generate_content(prompt)

            if not response or not response.text:
                raise ValueError("Empty response from Gemini")

            return response.text.strip()

        except ResourceExhausted:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError("LLM rate limit exceeded")


# ---------------------------------------------------------
# Utility: Clean & Parse JSON from LLM
# ---------------------------------------------------------

def _safe_json_parse(raw_text: str) -> dict:
    """
    Removes markdown wrappers and safely parses JSON.
    """

    if not raw_text:
        raise ValueError("Empty AI response")

    cleaned = raw_text.strip()

    # Remove markdown wrapping if present
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "")
        cleaned = cleaned.replace("```", "")
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)

    except json.JSONDecodeError:
        print("\n========== LLM RAW RESPONSE ==========")
        print(cleaned)
        print("======================================\n")
        raise ValueError("AI returned invalid JSON format")


# ---------------------------------------------------------
# Mental Health Support LLM
# ---------------------------------------------------------

def call_llm(profile, session, history, user_message, emotion):

    prompt = f"""
You are a calm, empathetic mental health support assistant.
You speak like a licensed therapist.
You do NOT diagnose or prescribe medication.

Patient background:
{profile}

Session context:
Goal: {session.get("session_goal")}
Risk level: {session.get("risk_level")}

Recent conversation:
{history}

Detected emotion:
{emotion}

User says:
"{user_message}"

Respond with empathy, validation, and gentle guidance.
"""

    try:
        return _call_gemini(mental_health_model, prompt)

    except RuntimeError:
        return (
            "I’m here with you. "
            "It looks like I need a moment to gather my thoughts. "
            "Can you tell me a little more about how you’re feeling right now?"
        )


# ---------------------------------------------------------
# Medical Report Analyzer
# ---------------------------------------------------------

def analyze_text_report(text_content: str, report_type: str, patient_profile: dict = None):

    gender = (patient_profile or {}).get("gender", "male")
    age = (patient_profile or {}).get("age", "adult")
    smoker = (patient_profile or {}).get("smoker", "non_smoker")

    prompt = f"""
You are a clinical laboratory interpretation AI trained on standard medical reference ranges.

STRICT RULES:
- Explain this report in simple language to person which do not no anything about madical field.
- Extract all lab test names, values, and units from the report.
- You MUST provide medically accepted standard reference ranges.
- Reference ranges MUST be appropriate for:
    Gender: {gender}
    Age: {age}
- Use globally accepted clinical laboratory standards.
- Do NOT invent rare or experimental ranges.
- Do NOT diagnose diseases.
- Do NOT prescribe medication.
- Explain results in simple language.
- Output MUST be valid pure JSON.
- No markdown.
- No text outside JSON.

Return EXACTLY this structure:

{{
  "structured_values": [
    {{
      "name": "",
      "value": "",
      "unit": "",
      "normal_range": "",
      "status": "normal | high | low | abnormal"
    }}
  ],
  "ai_explanation": "",
  "risk_level": "low | medium | high"
}}

Status rules:
- If value within reference range → normal
- If above range → high
- If below range → low
- If borderline clinically → abnormal

Risk Level rules:
- All normal → low
- 1-2 abnormal → medium
- Multiple abnormal or severe deviation → high

Report Type: {report_type}

Medical Report Content:
{text_content}
"""

    raw_response = _call_gemini(medical_model, prompt)
    return _safe_json_parse(raw_response)
