from __future__ import annotations

from inference.schemas import Detection, Event
from .config import RuleConfig
from .spatial import (
    center_inside,
    distance_between_bboxes,
    head_region,
    iou,
    torso_region,
)
from .zones import Zone, get_zone_violations


class RuleEngine:
    """Centralized event generator.

    All safety events are created here.  Helper modules (spatial, zones)
    provide computation utilities but never produce ``Event`` objects.
    """

    def __init__(self, config: RuleConfig | None = None) -> None:
        self._cfg = config or RuleConfig()

    def generate_events(
        self,
        detections: list[Detection],
        zones: list[Zone],
        timestamp: str,
        image_width: int | None = None,
    ) -> list[Event]:
        events: list[Event] = []

        persons = [d for d in detections if d.class_name == "person"]
        hardhats = [d for d in detections if d.class_name == "hardhat"]
        vests = [d for d in detections if d.class_name == "safety_vest"]
        forklifts = [d for d in detections if d.class_name in self._cfg.heavy_vehicle_classes]

        events.extend(self._check_no_hardhat(persons, hardhats, timestamp))
        events.extend(self._check_no_vest(persons, vests, timestamp))
        events.extend(self._check_restricted_zone(detections, zones, timestamp))
        events.extend(self._check_unsafe_proximity(persons, forklifts, timestamp, image_width))
        events.extend(self._check_fire_smoke(detections, timestamp))

        return events

    def _check_no_hardhat(
        self,
        persons: list[Detection],
        hardhats: list[Detection],
        timestamp: str,
    ) -> list[Event]:
        events: list[Event] = []
        for person in persons:
            head = head_region(person.bbox, self._cfg.head_ratio)
            has_hardhat = any(
                iou(head, hh.bbox) >= self._cfg.hardhat_iou_threshold
                or center_inside(hh.bbox, head)
                for hh in hardhats
            )
            if not has_hardhat:
                events.append(
                    Event(
                        event_type="no_hardhat",
                        confidence=person.confidence,
                        related_class_names=["person"],
                        timestamp=timestamp,
                        message="Person detected without hardhat",
                        metadata={"person_bbox": person.bbox},
                    )
                )
        return events

    def _check_no_vest(
        self,
        persons: list[Detection],
        vests: list[Detection],
        timestamp: str,
    ) -> list[Event]:
        events: list[Event] = []
        for person in persons:
            torso = torso_region(
                person.bbox,
                self._cfg.torso_top_ratio,
                self._cfg.torso_bottom_ratio,
            )
            has_vest = any(
                iou(torso, v.bbox) >= self._cfg.vest_iou_threshold
                or center_inside(v.bbox, person.bbox)
                for v in vests
            )
            if not has_vest:
                events.append(
                    Event(
                        event_type="no_vest",
                        confidence=person.confidence,
                        related_class_names=["person"],
                        timestamp=timestamp,
                        message="Person detected without safety vest",
                        metadata={"person_bbox": person.bbox},
                    )
                )
        return events

    def _check_restricted_zone(
        self,
        detections: list[Detection],
        zones: list[Zone],
        timestamp: str,
    ) -> list[Event]:
        violations = get_zone_violations(
            detections,
            zones,
            target_classes=self._cfg.restricted_zone_target_classes,
            mode=self._cfg.restricted_zone_mode,
        )
        events: list[Event] = []
        for v in violations:
            events.append(
                Event(
                    event_type="restricted_zone_entry",
                    confidence=v.detection.confidence,
                    related_class_names=[v.detection.class_name],
                    timestamp=timestamp,
                    message=f"Person entered restricted zone",
                    metadata={
                        "detection_bbox": v.detection.bbox,
                        "zone_id": v.zone.zone_id,
                    },
                )
            )
        return events

    def _check_unsafe_proximity(
        self,
        persons: list[Detection],
        heavy_vehicles: list[Detection],
        timestamp: str,
        image_width: int | None = None,
    ) -> list[Event]:
        events: list[Event] = []
        for person in persons:
            for vehicle in heavy_vehicles:
                dist = distance_between_bboxes(person.bbox, vehicle.bbox)
                if image_width and image_width > 0:
                    is_close = (dist / image_width) < self._cfg.proximity_threshold_norm
                else:
                    is_close = dist < self._cfg.proximity_threshold_px
                if is_close:
                    events.append(
                        Event(
                            event_type="unsafe_proximity",
                            confidence=min(person.confidence, vehicle.confidence),
                            related_class_names=["person", vehicle.class_name],
                            timestamp=timestamp,
                            message=f"Heavy vehicle and person are within unsafe proximity",
                            metadata={
                                "person_bbox": person.bbox,
                                "vehicle_bbox": vehicle.bbox,
                                "vehicle_class": vehicle.class_name,
                                "distance_px": round(dist, 2),
                                "distance_norm": round(dist / image_width, 4) if image_width else None,
                            },
                        )
                    )
        return events

    def _check_fire_smoke(
        self,
        detections: list[Detection],
        timestamp: str,
    ) -> list[Event]:
        events: list[Event] = []
        for det in detections:
            if det.class_name not in self._cfg.fire_smoke_classes:
                continue
            if det.confidence < self._cfg.fire_smoke_min_confidence:
                continue
            label = "YangÄ±n" if det.class_name == "fire" else "Duman"
            events.append(
                Event(
                    event_type="fire_smoke",
                    confidence=det.confidence,
                    related_class_names=[det.class_name],
                    timestamp=timestamp,
                    message=f"{label} tespit edildi ({det.class_name})",
                    metadata={
                        "detection_bbox": det.bbox,
                        "hazard_class": det.class_name,
                    },
                )
            )
        return events
