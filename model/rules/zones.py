from __future__ import annotations

from pydantic import BaseModel

from inference.schemas import Detection
from .spatial import (
    bbox_bottom_center,
    bbox_center,
    bbox_intersects_polygon,
    point_in_polygon,
)


class Zone(BaseModel):
    zone_id: str
    name: str
    type: str  # "restricted", etc.
    polygon: list[tuple[float, float]]


class ZoneViolation(BaseModel):
    detection: Detection
    zone: Zone


def get_zone_violations(
    detections: list[Detection],
    zones: list[Zone],
    target_classes: frozenset[str] = frozenset({"person", "forklift"}),
    mode: str = "intersect",
) -> list[ZoneViolation]:
    """Check which detections intersect restricted zones (or single-point modes).

    Returns (detection, zone) pairs â€” does NOT create Event objects;
    event creation is the responsibility of the rule engine.
    """
    violations: list[ZoneViolation] = []

    restricted = [z for z in zones if z.type == "restricted"]
    if not restricted:
        return violations

    for det in detections:
        if det.class_name not in target_classes:
            continue
        for zone in restricted:
            if mode == "intersect":
                hit = bbox_intersects_polygon(det.bbox, zone.polygon)
            elif mode == "point_bottom_center":
                ref = bbox_bottom_center(det.bbox)
                hit = point_in_polygon(ref, zone.polygon)
            elif mode == "point_center":
                ref = bbox_center(det.bbox)
                hit = point_in_polygon(ref, zone.polygon)
            else:
                raise ValueError(
                    f"unknown restricted_zone_mode: {mode!r} "
                    "(use intersect, point_center, point_bottom_center)"
                )
            if hit:
                violations.append(ZoneViolation(detection=det, zone=zone))

    return violations
