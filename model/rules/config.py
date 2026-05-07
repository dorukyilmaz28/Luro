from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RuleConfig:
    """Configurable thresholds for the safety rule engine."""

    head_ratio: float = 0.30
    torso_top_ratio: float = 0.30
    torso_bottom_ratio: float = 0.70
    hardhat_iou_threshold: float = 0.10
    vest_iou_threshold: float = 0.15
    proximity_threshold_px: float = 150.0
    proximity_threshold_norm: float = 0.12
    heavy_vehicle_classes: frozenset[str] = frozenset({"forklift", "machinery", "vehicle"})
    restricted_zone_target_classes: frozenset[str] = frozenset({"person", "forklift", "machinery", "vehicle"})
    #: ``intersect`` = bbox ile poligon herhangi bir ÅŸekilde Ã¶rtÃ¼ÅŸÃ¼rse ihlal;
    #: ``point_center`` / ``point_bottom_center`` = tek nokta (eski davranÄ±ÅŸ).
    restricted_zone_mode: str = "intersect"  # "intersect" | "point_center" | "point_bottom_center"
    fire_smoke_classes: frozenset[str] = frozenset({"fire", "smoke"})
    fire_smoke_min_confidence: float = 0.28
