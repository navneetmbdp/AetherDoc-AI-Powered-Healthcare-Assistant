from __future__ import annotations

from pathlib import Path

import cv2


class VisionService:
    def __init__(self) -> None:
        self._root = Path(__file__).resolve().parent / "assets"
        self._models = None
        self._class_lists = None

    def _load(self) -> None:
        if self._models is not None:
            return

        from ultralytics import YOLO

        burn_model = self._root / "models" / "burn.pt"
        blood_model = self._root / "models" / "blood.pt"
        wound_model = self._root / "models" / "wound.pt"

        for model_path in (burn_model, blood_model, wound_model):
            if not model_path.exists():
                raise FileNotFoundError(f"Missing vision model file: {model_path}")

        self._models = [YOLO(str(burn_model)), YOLO(str(blood_model)), YOLO(str(wound_model))]

        class_files = [
            self._root / "labels" / "burn.txt",
            self._root / "labels" / "blood.txt",
            self._root / "labels" / "wound.txt",
        ]

        class_lists = []
        for path in class_files:
            if not path.exists():
                raise FileNotFoundError(f"Missing class labels file: {path}")
            class_lists.append(path.read_text(encoding="utf-8").splitlines())

        self._class_lists = class_lists

    @staticmethod
    def _annotate_frame(frame, detections, class_list):
        for row in detections:
            x1, y1, x2, y2, _, class_idx = map(int, row)
            label = class_list[class_idx] if class_idx < len(class_list) else str(class_idx)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
            cv2.putText(frame, label, (x1, max(y1 - 10, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        return frame

    def analyze_video(self, video_path: str, output_dir: str | None = None, max_frames: int = 200):
        self._load()

        result = {"blood": False, "wound": False, "burn": False}
        counters = [0, 0, 0]

        capture = cv2.VideoCapture(video_path)
        out_dir = Path(output_dir) if output_dir else None
        if out_dir:
            out_dir.mkdir(parents=True, exist_ok=True)

        frame_count = 0
        while frame_count < max_frames:
            ok, frame = capture.read()
            if not ok:
                break

            frame_count += 1
            frame = cv2.resize(frame, (1020, 500))

            for index, model in enumerate(self._models):
                prediction = model.predict(frame, verbose=False)
                boxes = prediction[0].boxes.data.tolist() if prediction else []
                if boxes:
                    if index == 0:
                        result["burn"] = True
                    elif index == 1:
                        result["blood"] = True
                    elif index == 2:
                        result["wound"] = True

                    if out_dir and counters[index] < 5:
                        annotated = self._annotate_frame(frame.copy(), boxes, self._class_lists[index])
                        cv2.imwrite(str(out_dir / f"model{index + 1}-{counters[index]}.jpg"), annotated)
                        counters[index] += 1

            for _ in range(7):
                ok, _ = capture.read()
                if not ok:
                    break

        capture.release()
        return result
