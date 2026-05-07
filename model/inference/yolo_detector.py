from __future__ import annotations

from pathlib import Path
from typing import Any

from .detector import DetectorBase
from .schemas import Detection


class YoloDetector(DetectorBase):
    """General YOLO detector for PPE + vehicle classes."""

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.35,
        class_conf_thresholds: dict[str, float] | None = None,
        class_min_area_px: dict[str, float] | None = None,
    ) -> None:
        model_file = Path(model_path)
        if not model_file.exists():
            raise FileNotFoundError(f"Model file not found: {model_file}")

        from ultralytics import YOLO

        self._model = YOLO(str(model_file))
        self._confidence_threshold = confidence_threshold
        self._class_conf_thresholds = class_conf_thresholds or {}
        self._class_min_area_px = class_min_area_px or {}

    def detect(self, image: Any) -> list[Detection]:
        results = self._model.predict(source=image, conf=self._confidence_threshold, verbose=False)
        detections: list[Detection] = []

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            names = result.names or {}

            for box in boxes:
                cls_id = int(box.cls.item())
                raw = names.get(cls_id, "")
                class_name = raw.lower().replace("-", "_").replace(" ", "_")

                confidence = float(box.conf.item())
                min_conf = self._class_conf_thresholds.get(class_name, self._confidence_threshold)
                if confidence < min_conf:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                width = max(0.0, x2 - x1)
                height = max(0.0, y2 - y1)
                min_area = self._class_min_area_px.get(class_name)
                if min_area is not None and width * height < min_area:
                    continue

                detections.append(
                    Detection(
                        class_name=class_name,
                        confidence=round(confidence, 4),
                        bbox=[round(v, 2) for v in (x1, y1, x2, y2)],
                        track_id=None,
                    )
                )

        return detections
