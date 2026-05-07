"""Convert Ultralytics Construction-PPE labels to Luro PPE classes.

Input classes (Construction-PPE):
  0 helmet, 1 gloves, 2 vest, 3 boots, 4 goggles, 5 none, 6 Person,
  7 no_helmet, 8 no_goggle, 9 no_gloves, 10 no_boots

Output classes (Luro PPE):
  0 person, 1 hardhat, 2 safety_vest, 3 forklift,
  4 safety_gloves, 5 safety_boots, 6 safety_goggles,
  7 no_hardhat, 8 no_safety_vest, 9 no_safety_gloves,
  10 no_safety_boots, 11 no_safety_goggles, 12 none_ppe

Usage:
  cd model
  python training/convert_construction_ppe.py --src "C:/datasets/construction-ppe" --dst "datasets/ppe"
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# construction-ppe -> luro class id
CLASS_MAP: dict[int, int] = {
    6: 0,  # Person -> person
    0: 1,  # helmet -> hardhat
    2: 2,  # vest -> safety_vest
    1: 4,  # gloves -> safety_gloves
    3: 5,  # boots -> safety_boots
    4: 6,  # goggles -> safety_goggles
    7: 7,  # no_helmet -> no_hardhat
    9: 9,  # no_gloves -> no_safety_gloves
    10: 10,  # no_boots -> no_safety_boots
    8: 11,  # no_goggle -> no_safety_goggles
    5: 12,  # none -> none_ppe
}


def _copy_images(src_img_dir: Path, dst_img_dir: Path) -> int:
    if not src_img_dir.exists():
        return 0
    dst_img_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for p in src_img_dir.iterdir():
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            shutil.copy2(p, dst_img_dir / p.name)
            count += 1
    return count


def _convert_labels(src_lbl_dir: Path, dst_lbl_dir: Path) -> int:
    if not src_lbl_dir.exists():
        return 0
    dst_lbl_dir.mkdir(parents=True, exist_ok=True)
    kept = 0
    for label_file in src_lbl_dir.glob("*.txt"):
        out_lines: list[str] = []
        for raw in label_file.read_text(encoding="utf-8").splitlines():
            parts = raw.strip().split()
            if len(parts) != 5:
                continue
            try:
                src_cls = int(parts[0])
            except ValueError:
                continue
            dst_cls = CLASS_MAP.get(src_cls)
            if dst_cls is None:
                continue
            out_lines.append(f"{dst_cls} {' '.join(parts[1:])}")
        if out_lines:
            (dst_lbl_dir / label_file.name).write_text("\n".join(out_lines) + "\n", encoding="utf-8")
            kept += 1
    return kept


def convert_split(src: Path, dst: Path, split: str) -> tuple[int, int]:
    src_img = src / "images" / split
    src_lbl = src / "labels" / split
    dst_img = dst / "images" / split
    dst_lbl = dst / "labels" / split
    img_count = _copy_images(src_img, dst_img)
    lbl_count = _convert_labels(src_lbl, dst_lbl)
    return img_count, lbl_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Construction-PPE -> Luro PPE classes")
    parser.add_argument("--src", required=True, help="Construction-PPE dataset root")
    parser.add_argument("--dst", required=True, help="Output dataset root")
    args = parser.parse_args()

    src = Path(args.src).resolve()
    dst = Path(args.dst).resolve()
    if not src.exists():
        raise FileNotFoundError(f"Source dataset not found: {src}")

    totals = {}
    for split in ("train", "val", "test"):
        totals[split] = convert_split(src, dst, split)

    print("Conversion completed:")
    for split in ("train", "val", "test"):
        imgs, labels = totals[split]
        print(f"  {split}: images={imgs}, labels_with_kept_classes={labels}")
    print(f"Output root: {dst}")


if __name__ == "__main__":
    main()
