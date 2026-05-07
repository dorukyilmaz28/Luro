from __future__ import annotations

from pathlib import Path

from .composite_detector import CompositeDetector
from .detector import DetectorBase
from .fire_smoke_yolo import FireSmokeYoloDetector


def stack_with_fire_smoke(
    base: DetectorBase,
    fire_smoke_model: str | Path | None,
    *,
    fire_smoke_conf: float = 0.28,
    fire_smoke_min_area: float = 400.0,
) -> DetectorBase:
    """PPE (veya baÅŸka) dedektÃ¶rÃ¼n Ã¼stÃ¼ne isteÄŸe baÄŸlÄ± yangÄ±n/duman YOLO ekler."""
    if fire_smoke_model is None or str(fire_smoke_model).strip() == "":
        return base
    path = Path(fire_smoke_model)
    fs = FireSmokeYoloDetector(
        path,
        confidence_threshold=fire_smoke_conf,
        min_area_px=fire_smoke_min_area,
    )
    return CompositeDetector(base, fs)
