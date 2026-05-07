from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2


def load_image(path: str | Path) -> Any:
    image_path = Path(path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Failed to read image: {image_path}")
    return image
