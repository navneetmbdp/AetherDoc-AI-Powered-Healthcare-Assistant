import base64
from gtts import gTTS
from tempfile import NamedTemporaryFile

def text_to_speech(text: str) -> str:
    with NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        tts = gTTS(text=text, lang="en")
        tts.save(tmp.name)

        with open(tmp.name, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")

    return encoded