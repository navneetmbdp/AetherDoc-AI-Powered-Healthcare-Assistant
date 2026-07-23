import numpy as np


def extract_acoustic_features(audio_data: np.ndarray, sample_rate: int) -> dict:
    import librosa

    y = audio_data.astype(np.float32)

    pitches, _ = librosa.piptrack(y=y, sr=sample_rate)
    mean_pitch = float(np.nanmean(pitches))

    rms = librosa.feature.rms(y=y)
    mean_intensity = float(np.mean(rms))

    zcr = librosa.feature.zero_crossing_rate(y=y)
    mean_zcr = float(np.mean(zcr))

    duration = float(librosa.get_duration(y=y, sr=sample_rate))

    pauses = librosa.effects.split(y)
    pause_durations = np.diff(pauses) / sample_rate if len(pauses) > 1 else []
    mean_pause_duration = float(np.mean(pause_durations)) if len(pause_durations) > 0 else 0.0

    return {
        "mean_pitch": mean_pitch,
        "mean_intensity": mean_intensity,
        "mean_zero_crossing_rate": mean_zcr,
        "duration_seconds": duration,
        "mean_pause_duration_seconds": mean_pause_duration,
    }


def transcribe_wav(file_path: str) -> str:
    import speech_recognition as sr

    recognizer = sr.Recognizer()
    with sr.AudioFile(file_path) as source:
        audio = recognizer.record(source)

    try:
        return recognizer.recognize_google(audio)
    except sr.UnknownValueError:
        return ""
