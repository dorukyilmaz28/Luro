from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from rules.rule_engine import RuleEngine
from rules.zones import Zone

from .detector import DetectorBase
from .schemas import FrameAnalysisResult


class SafetyPipeline:
    """Runs detection + rule generation for a single frame."""

    def __init__(self, detector: DetectorBase, rule_engine: RuleEngine | None = None) -> None:
        self._detector = detector
        self._rule_engine = rule_engine or RuleEngine()

    def analyze(
        self,
        image: Any,
        timestamp: str | None = None,
        zones: list[Zone] | None = None,
    ) -> FrameAnalysisResult:
        detections = self._detector.detect(image)

        if image is None:
            image_width = 0
            image_height = 0
        else:
            image_height = int(image.shape[0])
            image_width = int(image.shape[1])

        ts = timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        zone_list = zones or []
        events = self._rule_engine.generate_events(
            detections=detections,
            zones=zone_list,
            timestamp=ts,
            image_width=image_width if image_width > 0 else None,
        )

        return FrameAnalysisResult(
            detections=detections,
            events=events,
            image_width=image_width,
            image_height=image_height,
            timestamp=ts,
        )
