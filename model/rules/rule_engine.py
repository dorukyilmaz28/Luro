from __future__ import annotations

from inference.schemas import Detection, Event
from .config import RuleConfig
from .spatial import (
    bbox_size,
    center_inside,
    distance_between_bboxes,
    foot_region,
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
        gloves = [d for d in detections if d.class_name == "safety_gloves"]
        boots = [d for d in detections if d.class_name == "safety_boots"]
        goggles = [d for d in detections if d.class_name == "safety_goggles"]
        forklifts = [d for d in detections if d.class_name in self._cfg.heavy_vehicle_classes]

        events.extend(self._check_no_hardhat(persons, hardhats, timestamp))
        events.extend(self._check_no_vest(persons, vests, timestamp))
        events.extend(self._check_no_gloves(persons, gloves, timestamp))
        events.extend(self._check_no_boots(persons, boots, timestamp))
        events.extend(self._check_no_goggles(persons, goggles, timestamp))
        events.extend(self._check_restricted_zone(detections, zones, timestamp))
        events.extend(self._check_unsafe_proximity(persons, forklifts, timestamp, image_width))
        events.extend(self._check_fire_smoke(detections, timestamp))
        events.extend(self._check_fall(persons, timestamp))

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

    def _check_no_gloves(
        self,
        persons: list[Detection],
        gloves: list[Detection],
        timestamp: str,
    ) -> list[Event]:
        events: list[Event] = []
        for person in persons:
            # Hands move too much for a fixed sub-region (raised, crossed, at the
            # side); matching against the full person box avoids false negatives.
            has_gloves = any(center_inside(g.bbox, person.bbox) for g in gloves)
            if not has_gloves:
                events.append(
                    Event(
                        event_type="no_safety_gloves",
                        confidence=person.confidence,
                        related_class_names=["person"],
                        timestamp=timestamp,
                        message="Person detected without safety gloves",
                        metadata={"person_bbox": person.bbox},
                    )
                )
        return events

    def _check_no_boots(
        self,
        persons: list[Detection],
        boots: list[Detection],
        timestamp: str,
    ) -> list[Event]:
        events: list[Event] = []
        for person in persons:
            foot = foot_region(person.bbox, self._cfg.foot_top_ratio)
            has_boots = any(
                iou(foot, b.bbox) >= self._cfg.boots_iou_threshold or center_inside(b.bbox, foot)
                for b in boots
            )
            if not has_boots:
                events.append(
                    Event(
                        event_type="no_safety_boots",
                        confidence=person.confidence,
                        related_class_names=["person"],
                        timestamp=timestamp,
                        message="Person detected without safety boots",
                        metadata={"person_bbox": person.bbox},
                    )
                )
        return events

    def _check_no_goggles(
        self,
        persons: list[Detection],
        goggles: list[Detection],
        timestamp: str,
    ) -> list[Event]:
        events: list[Event] = []
        for person in persons:
            head = head_region(person.bbox, self._cfg.head_ratio)
            has_goggles = any(
                iou(head, g.bbox) >= self._cfg.goggles_iou_threshold or center_inside(g.bbox, head)
                for g in goggles
            )
            if not has_goggles:
                events.append(
                    Event(
                        event_type="no_safety_goggles",
                        confidence=person.confidence,
                        related_class_names=["person"],
                        timestamp=timestamp,
                        message="Person detected without safety goggles",
                        metadata={"person_bbox": person.bbox},
                    )
                )
        return events

    def _check_fall(
        self,
        persons: list[Detection],
        timestamp: str,
    ) -> list[Event]:
        """Heuristic fall flag from bbox aspect ratio alone (no pose model yet).

        A standing person's box is taller than wide; a person lying down
        flips that. This is a single-frame heuristic and will also fire on
        bending/crouching, so callers should require it to persist across
        several consecutive frames (see camera_runner.py --confirm-frames)
        before treating it as a real incident.
        """
        events: list[Event] = []
        for person in persons:
            w, h = bbox_size(person.bbox)
            if h <= 0 or w * h < self._cfg.fall_min_area_px:
                continue
            ratio = w / h
            if ratio >= self._cfg.fall_aspect_ratio_threshold:
                events.append(
                    Event(
                        event_type="person_fall_suspected",
                        confidence=person.confidence,
                        related_class_names=["person"],
                        timestamp=timestamp,
                        message="Person detected in a possible fall (horizontal) position",
                        metadata={"person_bbox": person.bbox, "aspect_ratio": round(ratio, 3)},
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
