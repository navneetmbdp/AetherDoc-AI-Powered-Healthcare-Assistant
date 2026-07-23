from app.services.convo import generate_response
from app.services.tts_service import text_to_speech
from app.core.session_memory import get_session, update_session
from app.prompts.emergency_prompt import build_emergency_prompt
from app.prompts.consultation_prompt import build_consultation_prompt
from app.prompts.mental_health_prompt import build_mental_health_prompt

def handle_conversation(session_id: str, mode: str, user_text: str):

    history = get_session(session_id)

    if mode == "emergency":
        prompt = build_emergency_prompt(history, user_text)

    elif mode == "consultation":
        prompt = build_consultation_prompt(history, user_text)

    elif mode == "mental":
        prompt = build_mental_health_prompt(history, user_text)

    else:
        raise ValueError("Invalid mode")

    ai_response = generate_response(prompt)

    update_session(session_id, user_text, ai_response)

    tts_audio = text_to_speech(ai_response)

    return {
        "session_id": session_id,
        "mode": mode,
        "response_text": ai_response,
        "tts_audio_base64": tts_audio,
    }