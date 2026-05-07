from __future__ import annotations

from pathlib import Path
from typing import Any

from .detector import DetectorBase
from .schemas import Detection

class FireSmokeYoloDetector(DetectorBase):
    """Sadece yangÄ±n / duman (ve isteÄŸe baÄŸlÄ± alev) kutularÄ±nÄ± dÃ¶ndÃ¼ren YOLO sarmalayÄ±cÄ±."""

    def __init__(
        self,
        model_path: str | Path,
        confidence_threshold: float = 0.28,
        min_area_px: float = 400.0,
    ) -> None:
        model_file = Path(model_path)
        if not model_file.exists():
            raise FileNotFoundError(
                f"YangÄ±n/duman modeli bulunamadÄ±: {model_file}. "
                "Ã–rnek: python training/train_fire_smoke.py veya hazÄ±r aÄŸÄ±rlÄ±k koyun."
            )
        self._confidence_threshold = confidence_threshold
        self._min_area_px = min_area_px
        from ultralytics import YOLO

        self._model = YOLO(str(model_file))

    def detect(self, image: Any) -> list[Detection]:
        results = self._model.predict(
            source=image,
            conf=self._confidence_threshold,
            verbose=False,
        )
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
                if class_name == "flame":
                    class_name = "fire"
                if class_name not in ("fire", "smoke"):
                    continue
                confidence = float(box.conf.item())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                width = max(0.0, x2 - x1)
                height = max(0.0, y2 - y1)
                if width * height < self._min_area_px:
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
