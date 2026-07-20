"""Luro inference HTTP service.

Wraps the existing SafetyPipeline as a small FastAPI app so the connector
(or any client) can POST a frame and get detections + rule events back.

Usage:
    cd model
    python server.py                     # default: models/luro_ppe.pt on port 8600
    LURO_FIRE_SMOKE_MODEL=models/luro_fire_smoke_full_cpu/weights/best.pt python server.py

Endpoints:
    GET  /health  -> {"status": "ok", "model": "..."}
    POST /infer   -> multipart file field "image" (jpeg/png), optional "zones" JSON string
                     returns FrameAnalysisResult JSON
"""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from inference.detector_bundle import stack_with_fire_smoke
from inference.pipeline import SafetyPipeline
from inference.schemas import FrameAnalysisResult
from inference.yolo_detector import YoloDetector
from rules.zones import Zone

MODEL_PATH = os.environ.get("LURO_MODEL", "models/luro_ppe.pt")
FIRE_SMOKE_MODEL = os.environ.get("LURO_FIRE_SMOKE_MODEL", "")
PORT = int(os.environ.get("LURO_INFER_PORT", "8600"))

# production_v1 profile (mirrors video_runner.apply_profile_overrides)
CONF_THRESHOLD = float(os.environ.get("LURO_CONF", "0.30"))
CLASS_CONF_THRESHOLDS = {
    "person": 0.58,
    "forklift": 0.80,
    "safety_vest": 0.62,
}
CLASS_MIN_AREA_PX = {
    "person": 4000.0,
    "forklift": 28000.0,
    "safety_vest": 1800.0,
}

_pipeline: SafetyPipeline | None = None


def parse_zones(raw: str | None) -> list[Zone]:
    if not raw:
        return []
    items = json.loads(raw)
    if not isinstance(items, list):
        raise ValueError("zones must be a JSON array")
    zones: list[Zone] = []
    for item in items:
        zones.append(
            Zone(
                zone_id=item["zone_id"],
                name=item.get("name", item["zone_id"]),
                type=item.get("type", "restricted"),
                polygon=[tuple(point) for point in item["polygon"]],
            )
        )
    return zones


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _pipeline
    base = YoloDetector(
        model_path=MODEL_PATH,
        confidence_threshold=CONF_THRESHOLD,
        class_conf_thresholds=CLASS_CONF_THRESHOLDS,
        class_min_area_px=CLASS_MIN_AREA_PX,
    )
    detector = stack_with_fire_smoke(base, FIRE_SMOKE_MODEL or None)
    _pipeline = SafetyPipeline(detector=detector)
    print(f"[luro-infer] model loaded: {MODEL_PATH}" + (f" + fire/smoke: {FIRE_SMOKE_MODEL}" if FIRE_SMOKE_MODEL else ""))
    yield


app = FastAPI(title="Luro Inference Service", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL_PATH, "fire_smoke": bool(FIRE_SMOKE_MODEL)}


@app.post("/infer", response_model=FrameAnalysisResult)
async def infer(
    image: UploadFile = File(...),
    zones: str | None = Form(default=None),
    timestamp: str | None = Form(default=None),
) -> FrameAnalysisResult:
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet.")

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    buffer = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not decode image (expected JPEG/PNG).")

    try:
        zone_list = parse_zones(zones)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid zones JSON: {exc}") from exc

    return _pipeline.analyze(image=frame, timestamp=timestamp, zones=zone_list or None)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
