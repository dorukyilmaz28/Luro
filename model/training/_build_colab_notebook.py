"""One-off generator for training/luro_ppe_train_colab.ipynb. Not part of the
runtime pipeline -- rerun manually if the Colab notebook needs regenerating."""

import json
from pathlib import Path


def code(src):
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": src.strip("\n").splitlines(keepends=True),
    }


def md(src):
    return {"cell_type": "markdown", "metadata": {}, "source": src.strip("\n").splitlines(keepends=True)}


cells = []

cells.append(
    md(
        """
# Luro PPE Model - Genisletilmis Veri Seti ile Egitim

Bu notebook su adimlari otomatik yapar:
1. Ultralytics Construction-PPE (1132 img, dogrudan indirilebilir, hesap gerekmez)
2. Roboflow'dan 3 ek veri seti (Construction Site Safety 2801 img, iki ayri forklift seti ~1900 img) - **kendi Roboflow API key'inizi** asagida isteyecek
3. Hepsini Luro'nun 13-sinifli semasina donusturup birlestirme
4. YOLOv8 egitimi (GPU'lu Colab runtime gerekir: Runtime > Change runtime type > T4 GPU)

Calistirmadan once: **Runtime > Change runtime type > T4 GPU** secin.
"""
    )
)

cells.append(
    code(
        """
!pip install -q ultralytics roboflow pyyaml
import torch
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
else:
    print("UYARI: GPU yok! Runtime > Change runtime type > T4 GPU secip yeniden baslatin.")
"""
    )
)

cells.append(
    code(
        """
import os, shutil
from pathlib import Path

ROOT = Path("/content/luro")
ROOT.mkdir(exist_ok=True)
os.chdir(ROOT)

DATASETS = ROOT / "datasets" / "ppe"
for split in ("train", "val", "test"):
    (DATASETS / "images" / split).mkdir(parents=True, exist_ok=True)
    (DATASETS / "labels" / split).mkdir(parents=True, exist_ok=True)

LURO_CLASSES = {
    "person": 0, "hardhat": 1, "safety_vest": 2, "forklift": 3,
    "safety_gloves": 4, "safety_boots": 5, "safety_goggles": 6,
    "no_hardhat": 7, "no_safety_vest": 8, "no_safety_gloves": 9,
    "no_safety_boots": 10, "no_safety_goggles": 11, "none_ppe": 12,
}
print("Hazir:", DATASETS)
"""
    )
)

cells.append(md("## 1) Ultralytics Construction-PPE (dogrudan indirme, hesap gerekmez)"))

cells.append(
    code(
        """
!wget -q "https://github.com/ultralytics/assets/releases/download/v0.0.0/construction-ppe.zip" -O construction-ppe.zip
!unzip -q -o construction-ppe.zip -d incoming_construction_ppe
!find incoming_construction_ppe -maxdepth 3 -type d
"""
    )
)

cells.append(
    code(
        """
# construction-ppe -> Luro class id (same mapping as model/training/convert_construction_ppe.py)
CLASS_MAP = {
    6: 0,   # Person -> person
    0: 1,   # helmet -> hardhat
    2: 2,   # vest -> safety_vest
    1: 4,   # gloves -> safety_gloves
    3: 5,   # boots -> safety_boots
    4: 6,   # goggles -> safety_goggles
    7: 7,   # no_helmet -> no_hardhat
    9: 9,   # no_gloves -> no_safety_gloves
    10: 10, # no_boots -> no_safety_boots
    8: 11,  # no_goggle -> no_safety_goggles
    5: 12,  # none -> none_ppe
}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

def convert_construction_ppe(src_root, dst_root):
    src_root = Path(src_root)
    candidates = [p for p in src_root.iterdir() if p.is_dir()]
    base = candidates[0] if candidates else src_root
    if (base / "images").exists():
        src_root = base

    totals = {}
    for split in ("train", "val", "test"):
        src_img = src_root / "images" / split
        src_lbl = src_root / "labels" / split
        dst_img = dst_root / "images" / split
        dst_lbl = dst_root / "labels" / split
        img_count = 0
        if src_img.exists():
            for p in src_img.iterdir():
                if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                    shutil.copy2(p, dst_img / p.name)
                    img_count += 1
        lbl_count = 0
        if src_lbl.exists():
            for label_file in src_lbl.glob("*.txt"):
                out_lines = []
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
                    (dst_lbl / label_file.name).write_text("\\n".join(out_lines) + "\\n", encoding="utf-8")
                    lbl_count += 1
        totals[split] = (img_count, lbl_count)
    return totals

print(convert_construction_ppe(ROOT / "incoming_construction_ppe", DATASETS))
"""
    )
)

cells.append(md("## 2) Roboflow veri setleri (API key gerekir - ucretsiz hesap yeterli)"))

cells.append(
    code(
        """
from getpass import getpass
ROBOFLOW_API_KEY = getpass("Roboflow API key: ")
"""
    )
)

cells.append(
    code(
        """
from roboflow import Roboflow

rf = Roboflow(api_key=ROBOFLOW_API_KEY)
INCOMING = ROOT / "incoming_datasets"
INCOMING.mkdir(exist_ok=True)

TARGETS = [
    ("roboflow-universe-projects", "construction-site-safety", None, "construction_site_safety"),
    ("robovis", "forklift-ikbzl", None, "forklift_robovis"),
    ("university-of-maryland", "forklift-u2ivk", 1, "forklift_umd"),
]

downloaded = {}
for workspace, project_slug, version, out_name in TARGETS:
    print(f"=== {workspace}/{project_slug} ===")
    project = rf.workspace(workspace).project(project_slug)
    ver = version or max(v.version for v in project.versions())
    dataset = project.version(ver).download("yolov8", location=str(INCOMING / out_name))
    downloaded[out_name] = dataset.location
    print("OK:", dataset.location)
"""
    )
)

cells.append(
    code(
        """
import yaml

PRESETS = {
    "construction_site_safety": {
        "person": "person", "hardhat": "hardhat", "no-hardhat": "no_hardhat",
        "safety vest": "safety_vest", "no-safety vest": "no_safety_vest",
        "gloves": "safety_gloves", "safety shoes": "safety_boots",
    },
    "forklift_robovis": {"forklift": "forklift", "person": "person"},
    "forklift_umd": {"fork_lift": "forklift"},
}
SPLIT_MAP = {"train": "train", "valid": "val", "test": "test"}

def load_source_names(src):
    data = yaml.safe_load((src / "data.yaml").read_text(encoding="utf-8"))
    names = data["names"]
    if isinstance(names, dict):
        return {int(k): v for k, v in names.items()}
    return dict(enumerate(names))

def copy_split(src, dst, src_split, dst_split, tag, id_to_luro_name):
    src_img_dir = src / src_split / "images"
    src_lbl_dir = src / src_split / "labels"
    if not src_img_dir.exists():
        return 0, 0
    dst_img_dir = dst / "images" / dst_split
    dst_lbl_dir = dst / "labels" / dst_split
    img_count = label_count = 0
    for img_path in src_img_dir.iterdir():
        if not (img_path.is_file() and img_path.suffix.lower() in IMAGE_EXTS):
            continue
        stem = img_path.stem.replace(" ", "_")
        out_name = f"{tag}__{stem}"
        label_path = src_lbl_dir / f"{img_path.stem}.txt"
        out_lines = []
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
                    xc, yc, w, h = coords
                elif len(coords) >= 6 and len(coords) % 2 == 0:
                    xs, ys = coords[0::2], coords[1::2]
                    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
                    xc, yc = (min_x + max_x) / 2, (min_y + max_y) / 2
                    w, h = max_x - min_x, max_y - min_y
                else:
                    continue
                out_lines.append(f"{luro_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")
        shutil.copy2(img_path, dst_img_dir / f"{out_name}{img_path.suffix.lower()}")
        img_count += 1
        if out_lines:
            (dst_lbl_dir / f"{out_name}.txt").write_text("\\n".join(out_lines) + "\\n", encoding="utf-8")
            label_count += 1
    return img_count, label_count

def convert_roboflow(src, dst, preset, tag):
    id_to_name = load_source_names(src)
    name_to_luro = PRESETS[preset]
    id_to_luro_name = {
        cid: name_to_luro[n.strip().lower()]
        for cid, n in id_to_name.items() if n.strip().lower() in name_to_luro
    }
    totals = {}
    for src_split, dst_split in SPLIT_MAP.items():
        totals[dst_split] = copy_split(src, dst, src_split, dst_split, tag, id_to_luro_name)
    return totals

print("construction_site_safety:", convert_roboflow(Path(downloaded["construction_site_safety"]), DATASETS, "construction_site_safety", "css"))
print("forklift_robovis:", convert_roboflow(Path(downloaded["forklift_robovis"]), DATASETS, "forklift_robovis", "forkrv"))
print("forklift_umd:", convert_roboflow(Path(downloaded["forklift_umd"]), DATASETS, "forklift_umd", "forkumd"))
"""
    )
)

cells.append(
    code(
        """
data_yaml = f'''path: {DATASETS}
train: images/train
val: images/val

names:
  0: person
  1: hardhat
  2: safety_vest
  3: forklift
  4: safety_gloves
  5: safety_boots
  6: safety_goggles
  7: no_hardhat
  8: no_safety_vest
  9: no_safety_gloves
  10: no_safety_boots
  11: no_safety_goggles
  12: none_ppe
'''
(DATASETS / "data.yaml").write_text(data_yaml, encoding="utf-8")

for split in ("train", "val", "test"):
    n = len(list((DATASETS / "images" / split).glob("*")))
    print(f"{split}: {n} images")
"""
    )
)

cells.append(
    md(
        "## 3) Egitim (YOLOv8m, GPU)\n\n"
        "Varsayilan ayarlar Colab'in ucretsiz T4'unde ~2-4 saatte biter. "
        "Daha kisa bir 'kanit' kosusu icin epochs=40, imgsz=640 kullanin."
    )
)

cells.append(
    code(
        """
from ultralytics import YOLO

model = YOLO("yolov8m.pt")
results = model.train(
    data=str(DATASETS / "data.yaml"),
    epochs=100,
    imgsz=896,
    batch=16,
    device=0,
    patience=25,
    workers=8,
    name="luro_ppe_v2",
)
"""
    )
)

cells.append(
    code(
        """
metrics = model.val()
print(metrics.box.map50, metrics.box.map)
"""
    )
)

cells.append(md("## 4) Sonucu indir"))

cells.append(
    code(
        """
import shutil as sh
best = Path(model.trainer.save_dir) / "weights" / "best.pt"
sh.copy(best, "/content/luro_ppe_v2.pt")
print("Model hazir: /content/luro_ppe_v2.pt")
print("Sol paneldeki dosya simgesinden indirin, sonra model/models/luro_ppe.pt yerine koyup demo.py ile test edin.")

from google.colab import files
files.download("/content/luro_ppe_v2.pt")
"""
    )
)

notebook = {
    "cells": cells,
    "metadata": {
        "colab": {"name": "luro_ppe_train_colab.ipynb", "provenance": []},
        "kernelspec": {"name": "python3", "display_name": "Python 3"},
        "accelerator": "GPU",
    },
    "nbformat": 4,
    "nbformat_minor": 0,
}

out_path = Path(__file__).resolve().parent / "luro_ppe_train_colab.ipynb"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1, ensure_ascii=False)
print("wrote", out_path)
