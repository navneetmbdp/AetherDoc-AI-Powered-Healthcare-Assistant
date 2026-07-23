from app.rescue_ai_models.audioToText import transcribe_wav
import shutil
from tempfile import NamedTemporaryFile
from pathlib import Path

def speech_to_text(upload_file) -> str:
    with NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        shutil.copyfileobj(upload_file.file, tmp)
        tmp_path = tmp.name

    try:
        transcript = transcribe_wav(tmp_path)
        return transcript.strip()
    finally:
        path = Path(tmp_path)
        if path.exists():
            path.unlink(missing_ok=True)
