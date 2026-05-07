from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .schemas import Detection


class DetectorBase(ABC):
    """Base detector interface for all detector implementations."""

    @abstractmethod
    def detect(self, image: Any) -> list[Detection]:
        raise NotImplementedError
