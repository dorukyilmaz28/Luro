from __future__ import annotations

from pydantic import BaseModel, Field

SUPPORTED_CLASSES_V1 = frozenset(
    {
        "person",
        "forklift",
        "hardhat",
        "safety_vest",
        "safety_gloves",
        "safety_boots",
        "safety_goggles",
        "no_hardhat",
        "no_safety_vest",
        "no_safety_gloves",
        "no_safety_boots",
        "no_safety_goggles",
        "none_ppe",
        "machinery",
        "fire",
        "smoke",
    }
)

EVENT_TYPES_V1 = frozenset({
    "no_hardhat",
    "no_vest",
    "restricted_zone_entry",
    "unsafe_proximity",
    "fire_smoke",
})


class Detection(BaseModel):
    class_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: list[float] = Field(min_length=4, max_length=4)
    track_id: int | None = None


class Event(BaseModel):
    event_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    related_class_names: list[str]
    timestamp: str
    message: str
    metadata: dict = Field(default_factory=dict)


class FrameAnalysisResult(BaseModel):
    detections: list[Detection]
    events: list[Event] = Field(default_factory=list)
    image_width: int
    image_height: int
    timestamp: str
