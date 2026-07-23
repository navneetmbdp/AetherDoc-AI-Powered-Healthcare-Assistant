import base64
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
import asyncio
import google.generativeai as genai
from gtts import gTTS

from app.core.config import settings


def _extract_json_payload(raw: str) -> str:
    cleaned = (raw or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def _normalize_analysis(data: dict[str, Any]) -> dict[str, Any]:
    risk_raw = str(data.get("risk_level", "medium")).strip().lower()
    risk_level = risk_raw if risk_raw in {"low", "medium", "high"} else "medium"

    findings = data.get("clinical_findings", [])
    if not isinstance(findings, list):
        findings = [str(findings)]
    findings = [str(x).strip() for x in findings if str(x).strip()] or [
        "No clear clinical finding extracted from the image."
    ]

    summary = data.get("simple_summary", [])
    if not isinstance(summary, list):
        summary = [str(summary)]
    summary = [str(x).strip() for x in summary if str(x).strip()]
    while len(summary) < 3:
        summary.append(
            [
                "The image has been reviewed by AI triage logic.",
                "Findings may be preliminary and should be clinically verified.",
                "Consult a licensed physician for a definitive diagnosis.",
            ][len(summary)]
        )

    recommendations_raw = data.get("recommendations", [])
    recommendations: list[dict[str, str]] = []
    if isinstance(recommendations_raw, list):
        for item in recommendations_raw:
            if isinstance(item, dict):
                name = str(item.get("name", "")).strip()
                dosage = str(item.get("dosage", "")).strip()
                duration = str(item.get("duration", "")).strip()
                if name:
                    recommendations.append(
                        {
                            "name": name,
                            "dosage": dosage or "As advised by a physician",
                            "duration": duration or "As clinically indicated",
                        }
                    )
            elif str(item).strip():
                recommendations.append(
                    {
                        "name": str(item).strip(),
                        "dosage": "As advised by a physician",
                        "duration": "As clinically indicated",
                    }
                )
    if not recommendations:
        recommendations = [
            {"name": "Observe symptoms", "dosage": "Monitor every few hours", "duration": "24-48 hours"}
        ]

    red_flags = data.get("red_flags", [])
    if not isinstance(red_flags, list):
        red_flags = [str(red_flags)]
    red_flags = [str(x).strip() for x in red_flags if str(x).strip()] or [
        "Worsening pain",
        "Breathing difficulty",
    ]

    follow_up = str(data.get("follow_up", "")).strip() or (
        "Follow up with a licensed physician for proper examination and diagnosis."
    )
    disclaimer = str(data.get("disclaimer", "")).strip() or (
        "AI output is supportive only and not a final diagnosis."
    )

    return {
        "risk_level": risk_level,
        "clinical_findings": findings,
        "simple_summary": summary,
        "recommendations": recommendations,
        "follow_up": follow_up,
        "red_flags": red_flags,
        "disclaimer": disclaimer,
    }


def _safe_json(raw: str) -> dict[str, Any]:
    payload = _extract_json_payload(raw)
    try:
        parsed = json.loads(payload)
        if not isinstance(parsed, dict):
            raise ValueError("Gemini response is not a JSON object")
        return _normalize_analysis(parsed)
    except Exception:
        return _normalize_analysis({})


def _extract_response_text(response: Any) -> str:
    text = getattr(response, "text", "") or ""
    if text:
        return text
    try:
        candidates = getattr(response, "candidates", []) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", []) if content else []
            for part in parts:
                part_text = getattr(part, "text", "") or ""
                if part_text:
                    return part_text
    except Exception:
        return ""
    return ""


def _fallback_analysis(reason: str) -> dict[str, Any]:
    short_reason = (reason or "service unavailable").split("\n", 1)[0][:220]
    return {
        "risk_level": "medium",
        "clinical_findings": [
            "Automated multimodal model response is temporarily unavailable.",
            "Image-level triage confidence is reduced in fallback mode.",
        ],
        "simple_summary": [
            "Your image upload was received successfully.",
            "The advanced AI interpretation service is temporarily busy or quota-limited.",
            "Please retry shortly or consult a doctor directly for urgent concerns.",
        ],
        "recommendations": [
            {"name": "Observe symptoms", "dosage": "Monitor every few hours", "duration": "24-48 hours"},
            {"name": "Hydration and rest", "dosage": "As needed", "duration": "2-3 days"},
        ],
        "follow_up": "Repeat upload with clear lighting and consult a licensed physician for definitive interpretation.",
        "red_flags": ["Severe pain", "Bleeding", "Breathing difficulty", "High fever"],
        "disclaimer": "AI output is supportive only and not a final diagnosis.",
        "service_status": "fallback",
        "error": short_reason,
    }


class GeminiMedicalService:
    def __init__(self):
        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            raise RuntimeError("Missing GEMINI_API_KEY in backend/.env")

        genai.configure(api_key=api_key)
        self.model_names = [
            "gemini-flash-latest",
        ]

    async def analyze_medical_image(self, image_data: bytes, mime_type: str):
        prompt = """
You are an expert medical image triage assistant for radiology and dermatology first-level screening.
Return STRICT JSON only.

JSON schema:
{
  "risk_level": "low | medium | high",
  "clinical_findings": ["short technical findings"],
  "simple_summary": ["plain language bullet points for patient"],
  "recommendations": [
    {"name": "medicine or action", "dosage": "clear dosage", "duration": "duration"}
  ],
  "follow_up": "when and how to follow up",
  "red_flags": ["urgent warning signs to watch"],
  "disclaimer": "medical disclaimer"
}

Rules:
- Be factual and concise.
- If uncertain, clearly say so and suggest next best test.
- Do not claim definitive diagnosis from one image alone.
- Include at least 3 simple_summary points.
- Keep recommendations practical and safe.
- Output valid JSON object only; do not wrap in markdown.
"""

        raw_analysis = ""
        call_errors: list[str] = []
        try:
            parsed = None
            for model_name in self.model_names:
                model = genai.GenerativeModel(model_name)
                try:
                    # Try strict JSON mode first.
                    response = await asyncio.to_thread(
                        model.generate_content,
                        [prompt, {"mime_type": mime_type,"data": base64.b64encode(image_data).decode()}],
                        generation_config={"response_mime_type": "application/json"},
                    )
                except Exception as exc:
                    call_errors.append(f"{model_name} json-mode: {exc}")
                    # Retry without response_mime_type for SDK/version compatibility.
                    try:
                        response = model.generate_content([prompt, {"mime_type": mime_type, "data": image_data}])
                    except Exception as exc2:
                        call_errors.append(f"{model_name} plain-mode: {exc2}")
                        continue

                raw_analysis = _extract_response_text(response)
                if not raw_analysis:
                    call_errors.append(f"{model_name}: empty analysis output")
                    continue

                parsed = _safe_json(raw_analysis)
                parsed["service_status"] = "live"
                parsed["model_used"] = model_name
                break

            if parsed is None:
                raise RuntimeError("; ".join(call_errors) or "Gemini call failed")
        except Exception as exc:
            parsed = _fallback_analysis(str(exc))

        summary_text = " ".join(parsed.get("simple_summary", [])) or "Analysis completed."
        speech_text = f"Medical image analysis summary. {summary_text}"

        audio_base64 = ""
        try:
            with NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
                audio_path = Path(temp_audio.name)
            try:
                await asyncio.to_thread(gTTS(text=speech_text, lang="en").save, str(audio_path))
                with audio_path.open("rb") as audio_file:
                    audio_base64 = base64.b64encode(audio_file.read()).decode("utf-8")
            finally:
                if audio_path.exists():
                    audio_path.unlink(missing_ok=True)
        except Exception:
            audio_base64 = ""

        return {
            **parsed,
            "audio_base64": audio_base64,
            "raw_analysis": raw_analysis,
        }
