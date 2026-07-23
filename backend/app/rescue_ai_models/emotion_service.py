from __future__ import annotations

from pathlib import Path

import numpy as np


FRAME_LENGTH = 2048
HOP_LENGTH = 512


class EmotionService:
    def __init__(self) -> None:
        self._model = None
        self._model_path = Path(__file__).resolve().parent / "assets" / "model1.h5"
        self._emotion_labels = ["neutral", "happy", "sad", "angry", "fear", "disgust"]

    def _get_model(self):
        if self._model is None:
            from tensorflow.keras.models import load_model

            if not self._model_path.exists():
                raise FileNotFoundError(f"Missing emotion model file: {self._model_path}")
            self._model = load_model(str(self._model_path))
        return self._model

    def _features_for_wav(self, wav_path: Path) -> np.ndarray:
        import librosa
        from pydub import AudioSegment

        y, sr = librosa.load(str(wav_path), sr=None, mono=True)
        raw_audio = AudioSegment.from_file(str(wav_path))
        samples = np.array(raw_audio.get_array_of_samples(), dtype="float32")

        trimmed, _ = librosa.effects.trim(samples, top_db=25)
        if len(trimmed) < 180000:
            padded = np.pad(trimmed, (0, 180000 - len(trimmed)), "constant")
        else:
            padded = trimmed[:180000]

        zcr = librosa.feature.zero_crossing_rate(padded, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)
        rms = librosa.feature.rms(y=padded, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)
        mfccs = librosa.feature.mfcc(y=padded, sr=sr, n_mfcc=13, hop_length=HOP_LENGTH)

        x = np.concatenate(
            (
                np.swapaxes([zcr], 1, 2),
                np.swapaxes([rms], 1, 2),
                np.swapaxes([mfccs], 1, 2),
            ),
            axis=2,
        )
        return x.astype("float32")

    def predict_emotion_from_wav(self, wav_path: str) -> str:
        model = self._get_model()
        features = self._features_for_wav(Path(wav_path))
        predicted_idx = int(np.argmax(model.predict(features, verbose=0)[0]))
        return self._emotion_labels[predicted_idx]
