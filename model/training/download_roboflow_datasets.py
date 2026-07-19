"""Download supplementary PPE/vehicle datasets from Roboflow Universe.

Pulls three public datasets into model/incoming_datasets/<project>, in
YOLOv8 format, ready for a source-specific converter to remap into the
Luro class schema (see training/convert_construction_ppe.py for the
pattern this follows).

Usage:
    cd model
    python training/download_roboflow_datasets.py
"""

from __future__ import annotations

import os
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = MODEL_DIR / ".env"
OUTPUT_ROOT = MODEL_DIR / "incoming_datasets"

# (workspace, project, version, output folder name)
TARGETS: list[tuple[str, str, int | None, str]] = [
    ("roboflow-universe-projects", "construction-site-safety", None, "construction_site_safety"),
    ("robovis", "forklift-ikbzl", None, "forklift_robovis"),
    ("university-of-maryland", "forklift-u2ivk", 1, "forklift_umd"),
]


def load_api_key() -> str:
    key = os.environ.get("ROBOFLOW_API_KEY")
    if key:
        return key
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("ROBOFLOW_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("ROBOFLOW_API_KEY not found in environment or model/.env")


def main() -> None:
    from roboflow import Roboflow

    api_key = load_api_key()
    rf = Roboflow(api_key=api_key)
    OUTPUT_ROOT.mkdir(exist_ok=True)

    for workspace, project_slug, version, out_name in TARGETS:
        print(f"\n=== {workspace}/{project_slug} ===")
        try:
            project = rf.workspace(workspace).project(project_slug)
            ver = version or max(v.version for v in project.versions())
            print(f"Using version {ver}")
            dataset = project.version(ver).download("yolov8", location=str(OUTPUT_ROOT / out_name))
            print(f"Downloaded to: {dataset.location}")
        except Exception as exc:  # noqa: BLE001
            print(f"FAILED: {workspace}/{project_slug}: {exc}")


if __name__ == "__main__":
    main()
