"""Train a YOLOv8 model for fire / smoke detection (separate weights from PPE).

Usage:
    cd model
    # Put YOLO-format images under datasets/fire_smoke/images/{train,val}
    # and labels under datasets/fire_smoke/labels/{train,val}
    python training/train_fire_smoke.py

Output: models/luro_fire_smoke.pt (best weights copy)
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
DATASET_YAML = Path(__file__).resolve().parent.parent / "datasets" / "fire_smoke" / "data.yaml"


def train(
    base_model: str = "yolov8n.pt",
    data_yaml: str | None = None,
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 16,
    workers: int = 8,
    device: str = "auto",
    patience: int = 20,
    run_name: str = "luro_fire_smoke",
) -> Path:
    from ultralytics import YOLO

    data = data_yaml or str(DATASET_YAML)
    data_path = Path(data)
    if not data_path.exists():
        raise FileNotFoundError(
            f"Dataset config not found: {data_path}\n"
            "Create datasets/fire_smoke/ and see datasets/fire_smoke/data.yaml"
        )

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
        degrees=7.0,
        translate=0.12,
        scale=0.25,
        hsv_h=0.015,
        hsv_s=0.70,
        hsv_v=0.40,
        project=str(MODEL_DIR),
        name=run_name,
        exist_ok=True,
    )

    best_weights = MODEL_DIR / run_name / "weights" / "best.pt"
    target = MODEL_DIR / "luro_fire_smoke.pt"

    if best_weights.exists():
        shutil.copy2(best_weights, target)
        print(f"\nBest weights: {best_weights}\nCopied to: {target}")
    else:
        print(f"Training finished but best.pt not found at {best_weights}")

    return target


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Luro fire/smoke YOLO model")
    parser.add_argument("--base-model", type=str, default="yolov8n.pt")
    parser.add_argument("--data", type=str, default=None, help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--device", type=str, default="auto", help='cuda:0 | cpu | auto')
    parser.add_argument("--patience", type=int, default=20)
    parser.add_argument("--run-name", type=str, default="luro_fire_smoke")
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
