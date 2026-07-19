"""Convert a downloaded Roboflow (YOLOv8-format) dataset into Luro PPE classes
and merge it into an existing Luro dataset (e.g. datasets/ppe).

Each source dataset has its own class names/order, so the mapping is
name-based (case-insensitive) rather than index-based, and is looked up
from PRESETS by --preset. Unmapped classes are dropped (same behavior as
convert_construction_ppe.py). Output filenames are prefixed with --tag to
avoid collisions with images already in the destination.

Usage:
    cd model
    python training/convert_roboflow_dataset.py \
        --src incoming_datasets/construction_site_safety \
        --dst datasets/ppe \
        --preset construction_site_safety \
        --tag css
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import yaml

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Luro PPE class ids (must match datasets/ppe/data.yaml)
LURO_CLASSES = {
    "person": 0,
    "hardhat": 1,
    "safety_vest": 2,
    "forklift": 3,
    "safety_gloves": 4,
    "safety_boots": 5,
    "safety_goggles": 6,
    "no_hardhat": 7,
    "no_safety_vest": 8,
    "no_safety_gloves": 9,
    "no_safety_boots": 10,
    "no_safety_goggles": 11,
    "none_ppe": 12,
}

# source class name (lowercase) -> Luro class name
PRESETS: dict[str, dict[str, str]] = {
    "construction_site_safety": {
        "person": "person",
        "hardhat": "hardhat",
        "no-hardhat": "no_hardhat",
        "safety vest": "safety_vest",
        "no-safety vest": "no_safety_vest",
        "gloves": "safety_gloves",
        "safety shoes": "safety_boots",
        # "mask" / "no-mask" have no Luro equivalent -> dropped
    },
    "forklift_robovis": {
        "forklift": "forklift",
        "person": "person",
    },
    "forklift_umd": {
        "fork_lift": "forklift",
        # material_over_sight / material_under_sight / signaler -> dropped
    },
}

# Roboflow splits use "valid", Luro uses "val"
SPLIT_MAP = {"train": "train", "valid": "val", "test": "test"}


def _load_source_names(src: Path) -> dict[int, str]:
    data = yaml.safe_load((src / "data.yaml").read_text(encoding="utf-8"))
    names = data["names"]
    if isinstance(names, dict):
        return {int(k): v for k, v in names.items()}
    return dict(enumerate(names))


def _copy_split(
    src: Path,
    dst: Path,
    src_split: str,
    dst_split: str,
    tag: str,
    id_to_luro_name: dict[int, str],
) -> tuple[int, int]:
    src_img_dir = src / src_split / "images"
    src_lbl_dir = src / src_split / "labels"
    if not src_img_dir.exists():
        return 0, 0

    dst_img_dir = dst / "images" / dst_split
    dst_lbl_dir = dst / "labels" / dst_split
    dst_img_dir.mkdir(parents=True, exist_ok=True)
    dst_lbl_dir.mkdir(parents=True, exist_ok=True)

    img_count = 0
    label_count = 0
    for img_path in src_img_dir.iterdir():
        if not (img_path.is_file() and img_path.suffix.lower() in IMAGE_EXTS):
            continue
        stem = img_path.stem.replace(" ", "_")
        out_name = f"{tag}__{stem}"

        label_path = src_lbl_dir / f"{img_path.stem}.txt"
        out_lines: list[str] = []
        if label_path.exists():
            for raw in label_path.read_text(encoding="utf-8").splitlines():
                parts = raw.strip().split()
                if len(parts) < 5:
                    continue
                try:
                    src_cls_id = int(parts[0])
                    coords = [float(v) for v in parts[1:]]
                except ValueError:
                    continue
                src_name = id_to_luro_name.get(src_cls_id)
                if src_name is None:
                    continue
                luro_id = LURO_CLASSES[src_name]

                if len(coords) == 4:
                    # Plain YOLO bbox: x_center y_center width height.
                    xc, yc, w, h = coords
                elif len(coords) >= 6 and len(coords) % 2 == 0:
                    # YOLO-seg polygon: x1 y1 x2 y2 ... -> bounding box.
                    xs = coords[0::2]
                    ys = coords[1::2]
                    min_x, max_x = min(xs), max(xs)
                    min_y, max_y = min(ys), max(ys)
                    xc, yc = (min_x + max_x) / 2, (min_y + max_y) / 2
                    w, h = max_x - min_x, max_y - min_y
                else:
                    continue

                out_lines.append(f"{luro_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")

        shutil.copy2(img_path, dst_img_dir / f"{out_name}{img_path.suffix.lower()}")
        img_count += 1
        if out_lines:
            (dst_lbl_dir / f"{out_name}.txt").write_text("\n".join(out_lines) + "\n", encoding="utf-8")
            label_count += 1

    return img_count, label_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a Roboflow YOLOv8 dataset into Luro PPE classes")
    parser.add_argument("--src", required=True, help="Downloaded Roboflow dataset root (has data.yaml)")
    parser.add_argument("--dst", required=True, help="Destination Luro dataset root (e.g. datasets/ppe)")
    parser.add_argument("--preset", required=True, choices=sorted(PRESETS), help="Class-name mapping preset")
    parser.add_argument("--tag", required=True, help="Filename prefix to avoid collisions in the destination")
    args = parser.parse_args()

    src = Path(args.src).resolve()
    dst = Path(args.dst).resolve()
    if not src.exists():
        raise FileNotFoundError(f"Source dataset not found: {src}")

    id_to_name = _load_source_names(src)
    name_to_luro = PRESETS[args.preset]
    id_to_luro_name = {
        cls_id: name_to_luro[name.strip().lower()]
        for cls_id, name in id_to_name.items()
        if name.strip().lower() in name_to_luro
    }

    print(f"Source classes: {id_to_name}")
    print(f"Mapped -> Luro: {id_to_luro_name}")
    dropped = [n for i, n in id_to_name.items() if i not in id_to_luro_name]
    if dropped:
        print(f"Dropped (no Luro equivalent): {dropped}")

    totals: dict[str, tuple[int, int]] = {}
    for src_split, dst_split in SPLIT_MAP.items():
        totals[dst_split] = _copy_split(src, dst, src_split, dst_split, args.tag, id_to_luro_name)

    print("\nConversion completed:")
    for split, (imgs, labels) in totals.items():
        print(f"  {split}: images={imgs}, labels_with_kept_classes={labels}")
    print(f"Output root: {dst}")


if __name__ == "__main__":
    main()
