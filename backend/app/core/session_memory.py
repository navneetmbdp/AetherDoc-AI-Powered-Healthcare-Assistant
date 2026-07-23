SESSION_MEMORY = {}

def get_session(session_id: str):
    return SESSION_MEMORY.setdefault(session_id, [])

def update_session(session_id: str, user_text: str, ai_text: str):
    history = SESSION_MEMORY.setdefault(session_id, [])
    history.append(f"User: {user_text}")
    history.append(f"AI: {ai_text}")
    SESSION_MEMORY[session_id] = history[-12:]