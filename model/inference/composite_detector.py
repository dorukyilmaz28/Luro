from __future__ import annotations

from typing import Any

from .detector import DetectorBase
from .schemas import Detection


class CompositeDetector(DetectorBase):
    """Birden fazla dedektÃ¶rÃ¼n Ã§Ä±ktÄ±sÄ±nÄ± birleÅŸtirir (Ã¶r. PPE + yangÄ±n/duman)."""

    def __init__(self, *detectors: DetectorBase) -> None:
        if not detectors:
            raise ValueError("CompositeDetector requires at least one detector")
        self._detectors = detectors

    def detect(self, image: Any) -> list[Detection]:
        merged: list[Detection] = []
        for det in self._detectors:
            merged.extend(det.detect(image))
        return merged
