"""Train a YOLOv8 model for PPE classes (person, hardhat, safety_vest, forklift).

Usage:
    cd model
    python training/train_ppe.py --base-model yolov8n.pt --data datasets/ppe/data.yaml

Output: models/luro_ppe.pt (best weights copy)
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
DATASET_YAML = Path(__file__).resolve().parent.parent / "datasets" / "ppe" / "data.yaml"


def train(
    base_model: str = "yolov8n.pt",
    data_yaml: str | None = None,
    epochs: int = 120,
    imgsz: int = 640,
    batch: int = 16,
    workers: int = 8,
    device: str = "auto",
    patience: int = 30,
    run_name: str = "luro_ppe",
) -> Path:
    from ultralytics import YOLO

    data = data_yaml or str(DATASET_YAML)
    data_path = Path(data)
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset config not found: {data_path}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    model = YOLO(base_model)
    model.train(
        data=data,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        workers=workers,
        device=device,
        patience=patience,
        cos_lr=True,
        close_mosaic=10,
        mixup=0.10,
        degrees=5.0,
        translate=0.10,
        scale=0.20,
        hsv_h=0.015,
        hsv_s=0.70,
        hsv_v=0.40,
        project=str(MODEL_DIR),
        name=run_name,
        exist_ok=True,
    )

    best_weights = MODEL_DIR / run_name / "weights" / "best.pt"
    target = MODEL_DIR / "luro_ppe.pt"

    if best_weights.exists():
        shutil.copy2(best_weights, target)
        print(f"Best weights copied to: {target}")
    else:
        print(f"Training finished but best.pt not found at {best_weights}")

    return target


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Luro PPE YOLO model")
    parser.add_argument("--base-model", type=str, default="yolov8n.pt")
    parser.add_argument("--data", type=str, default=None, help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=120)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--device", type=str, default="auto", help='cuda:0 | cpu | auto')
    parser.add_argument("--patience", type=int, default=30)
    parser.add_argument("--run-name", type=str, default="luro_ppe")
    args = parser.parse_args()

    train(
        base_model=args.base_model,
        data_yaml=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        workers=args.workers,
        device=args.device,
        patience=args.patience,
        run_name=args.run_name,
    )


if __name__ == "__main__":
    main()
