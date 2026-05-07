"""Merge multiple YOLO datasets into one train/val dataset.

Usage:
    cd model
    python training/build_yolo_dataset.py --sources "C:/ds1" "C:/ds2" --output datasets/ppe
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _iter_images(root: Path) -> list[Path]:
    return [p for p in root.rglob("*") if p.suffix.lower() in IMAGE_EXTS]


def _safe_name(source_tag: str, image_path: Path) -> str:
    stem = image_path.stem.replace(" ", "_")
    return f"{source_tag}__{stem}"


def _find_label_for_image(image_path: Path) -> Path | None:
    candidate = image_path.with_suffix(".txt")
    if candidate.exists():
        return candidate
    if "images" in image_path.parts:
        parts = list(image_path.parts)
        idx = parts.index("images")
        parts[idx] = "labels"
        alt = Path(*parts).with_suffix(".txt")
        if alt.exists():
            return alt
    return None


def build_dataset(
    sources: list[Path],
    output: Path,
    train_ratio: float,
    seed: int,
) -> tuple[int, int]:
    random.seed(seed)

    image_train = output / "images" / "train"
    image_val = output / "images" / "val"
    label_train = output / "labels" / "train"
    label_val = output / "labels" / "val"
    for d in (image_train, image_val, label_train, label_val):
        d.mkdir(parents=True, exist_ok=True)

    pairs: list[tuple[Path, Path]] = []
    for src in sources:
        if not src.exists():
            raise FileNotFoundError(f"Source dataset not found: {src}")
        for image in _iter_images(src):
            label = _find_label_for_image(image)
            if label is None:
                continue
            pairs.append((image, label))

    if not pairs:
        raise ValueError("No image/label pairs found in provided sources.")

    random.shuffle(pairs)
    split = int(len(pairs) * train_ratio)
    train_pairs = pairs[:split]
    val_pairs = pairs[split:]

    def _copy(items: list[tuple[Path, Path]], image_dir: Path, label_dir: Path, tag: str) -> None:
        for image, label in items:
            name = _safe_name(tag, image)
            dst_img = image_dir / f"{name}{image.suffix.lower()}"
            dst_lbl = label_dir / f"{name}.txt"
            shutil.copy2(image, dst_img)
            shutil.copy2(label, dst_lbl)

    for src in sources:
        src_pairs = [(i, l) for (i, l) in train_pairs if str(i).startswith(str(src))]
        _copy(src_pairs, image_train, label_train, src.name)
        src_pairs = [(i, l) for (i, l) in val_pairs if str(i).startswith(str(src))]
        _copy(src_pairs, image_val, label_val, src.name)

    return len(train_pairs), len(val_pairs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build merged YOLO dataset with train/val split")
    parser.add_argument("--sources", nargs="+", required=True, help="Input dataset roots")
    parser.add_argument("--output", required=True, help="Output dataset path (e.g. datasets/ppe)")
    parser.add_argument("--train-ratio", type=float, default=0.9)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if not 0.5 <= args.train_ratio < 1.0:
        raise ValueError("--train-ratio must be between 0.5 and <1.0")

    sources = [Path(p).resolve() for p in args.sources]
    output = Path(args.output).resolve()
    train_count, val_count = build_dataset(
        sources=sources,
        output=output,
        train_ratio=args.train_ratio,
        seed=args.seed,
    )
    print(f"Done. train={train_count}, val={val_count}, output={output}")


if __name__ == "__main__":
    main()
