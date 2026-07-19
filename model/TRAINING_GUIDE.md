# Model Training Guide

## 1) Merge More Data Into One Dataset

For large, mixed sources (Roboflow exports, manual labels, older runs), merge first:

```bash
cd model
python training/build_yolo_dataset.py \
  --sources "C:/datasets/ppe_v1" "C:/datasets/ppe_v2" "C:/datasets/client_extra" \
  --output "datasets/ppe" \
  --train-ratio 0.90 \
  --seed 42
```

> The script copies valid image+label pairs into `images/train|val` and `labels/train|val`.

## 1.1) Construction-PPE -> Luro Class Conversion

Construction-PPE has 11 classes; Luro PPE uses 13:
- `0 person`
- `1 hardhat`
- `2 safety_vest`
- `3 forklift` (not present in Construction-PPE — needs a separate source, see note below)
- `4 safety_gloves`
- `5 safety_boots`
- `6 safety_goggles`
- `7 no_hardhat`
- `8 no_safety_vest`
- `9 no_safety_gloves`
- `10 no_safety_boots`
- `11 no_safety_goggles`
- `12 none_ppe`

`models/luro_ppe.pt` was already trained on all 13 classes (verify with
`python -c "from ultralytics import YOLO; print(YOLO('models/luro_ppe.pt').names)"`),
but `forklift` currently has **zero training images** since Construction-PPE doesn't
include it — merge in a dedicated forklift/vehicle dataset via `build_yolo_dataset.py`
before relying on proximity-to-forklift events in production.

Convert with:

```bash
cd model
python training/convert_construction_ppe.py \
  --src "C:/datasets/construction-ppe" \
  --dst "datasets/ppe"
```

Then optionally merge this converted set with other PPE sources using `build_yolo_dataset.py`.

## 2) PPE Comprehensive Training

```bash
cd model
python training/train_ppe.py \
  --base-model yolov8m.pt \
  --data datasets/ppe/data.yaml \
  --epochs 180 \
  --imgsz 960 \
  --batch 8 \
  --workers 8 \
  --device cuda:0 \
  --patience 40 \
  --run-name luro_ppe_bigset
```

## 3) Fire/Smoke Comprehensive Training

```bash
cd model
python training/train_fire_smoke.py \
  --base-model yolov8m.pt \
  --data datasets/fire_smoke/data.yaml \
  --epochs 140 \
  --imgsz 960 \
  --batch 8 \
  --workers 8 \
  --device cuda:0 \
  --patience 30 \
  --run-name luro_fire_smoke_bigset
```

## 4) Evaluate Quickly On Image

```bash
cd model
python demo.py --image samples/test.jpg --use-yolo --model-path models/luro_ppe.pt --pretty
```

## Notes

- If VRAM is low, reduce `--imgsz` and/or `--batch`.
- Prefer `yolov8m.pt` or `yolov8l.pt` for better quality when you have enough data.
- Keep class definitions in `datasets/*/data.yaml` aligned with your labels.
