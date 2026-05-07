from __future__ import annotations

from typing import Any

from .detector import DetectorBase
from .schemas import Detection


class MockDetector(DetectorBase):
    """Returns hard-coded detections that cover the four V1 safety scenarios.

    Useful for developing and testing the rule engine and pipeline without
    a trained model.
    """

    def __init__(self, scenario: str = "all") -> None:
        self._scenario = scenario

    def detect(self, image: Any = None) -> list[Detection]:
        scenarios = {
            "no_hardhat": self._scenario_no_hardhat,
            "no_vest": self._scenario_no_vest,
            "proximity": self._scenario_proximity,
            "restricted_zone": self._scenario_restricted_zone,
            "fire_smoke": self._scenario_fire_smoke,
        }

        if self._scenario == "all":
            detections: list[Detection] = []
            for fn in scenarios.values():
                detections.extend(fn())
            return detections

        fn = scenarios.get(self._scenario)
        if fn is None:
            raise ValueError(f"Unknown scenario: {self._scenario}")
        return fn()

    @staticmethod
    def _scenario_no_hardhat() -> list[Detection]:
        return [
            Detection(class_name="person", confidence=0.95, bbox=[100, 100, 250, 450]),
        ]

    @staticmethod
    def _scenario_no_vest() -> list[Detection]:
        return [
            Detection(class_name="person", confidence=0.92, bbox=[400, 120, 550, 480]),
            Detection(class_name="hardhat", confidence=0.88, bbox=[420, 100, 530, 160]),
        ]

    @staticmethod
    def _scenario_proximity() -> list[Detection]:
        return [
            Detection(class_name="person", confidence=0.94, bbox=[300, 200, 400, 500]),
            Detection(class_name="hardhat", confidence=0.85, bbox=[310, 180, 390, 230]),
            Detection(class_name="safety_vest", confidence=0.90, bbox=[305, 290, 395, 420]),
            Detection(class_name="forklift", confidence=0.97, bbox=[350, 180, 580, 520]),
        ]

    @staticmethod
    def _scenario_restricted_zone() -> list[Detection]:
        return [
            Detection(class_name="person", confidence=0.93, bbox=[180, 200, 280, 480]),
            Detection(class_name="hardhat", confidence=0.87, bbox=[195, 180, 265, 230]),
            Detection(class_name="safety_vest", confidence=0.89, bbox=[185, 290, 275, 400]),
        ]

    @staticmethod
    def _scenario_fire_smoke() -> list[Detection]:
        return [
            Detection(class_name="smoke", confidence=0.72, bbox=[400, 80, 720, 320]),
            Detection(class_name="fire", confidence=0.65, bbox=[500, 250, 580, 340]),
        ]
