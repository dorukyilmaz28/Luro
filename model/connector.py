"""Luro Connector — runs on a computer at the customer's site.

Pulls frames from the cameras defined in connector_config.json, sends each
frame to the Luro inference service, and forwards detected violation events
to the Luro dashboard (/api/events) using the customer's ingest token.

Usage:
    cd model
    python connector.py                     # continuous loop
    python connector.py --once              # single pass over all cameras (testing)
    python connector.py --config my.json

Config (connector_config.json — see connector_config.example.json):
    siteUrl     Luro dashboard base URL, e.g. https://www.luro-ai.com
    ingestToken token from Dashboard -> Ayarlar -> Luro Baglayici
    inferUrl    inference service URL, e.g. http://localhost:8600
    intervalSec seconds between passes (default 5)
    cooldownSec per camera+event_type re-report cooldown (default 60)
    cameras     [{"code": "CAM-01", "source": "rtsp://..." | "video.mp4" | 0}]
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
import time
from pathlib import Path

import cv2
import requests

DEFAULT_INTERVAL_SEC = 5
DEFAULT_COOLDOWN_SEC = 60
REQUEST_TIMEOUT_SEC = 30
TRACK_IOU_THRESHOLD = 0.4
TRACK_MAX_MISSES = 3

# BGR colors for annotation boxes drawn onto the snapshot.
COLOR_PERSON = (0, 176, 80)      # green
COLOR_VIOLATION = (60, 60, 220)  # red
COLOR_PPE_OK = (200, 150, 40)    # blue


def bbox_iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    denom = area_a + area_b - inter
    return inter / denom if denom > 0 else 0.0


class PersonTracker:
    """Assigns a stable id to each person across passes using bbox overlap.

    Lets us suppress repeat alerts for the *same* person standing in place —
    not true re-identification (a person who leaves and returns gets a new id),
    but enough to stop a stationary worker from spamming the same violation.
    """

    def __init__(self, iou_threshold: float = TRACK_IOU_THRESHOLD, max_misses: int = TRACK_MAX_MISSES) -> None:
        self._tracks: list[dict] = []  # {id, bbox, misses}
        self._next_id = 1
        self._iou_threshold = iou_threshold
        self._max_misses = max_misses

    def update(self, person_bboxes: list[list[float]]) -> list[int]:
        assigned: list[int] = [0] * len(person_bboxes)
        used: set[int] = set()
        for i, bbox in enumerate(person_bboxes):
            best_j, best_iou = -1, self._iou_threshold
            for j, track in enumerate(self._tracks):
                if j in used:
                    continue
                value = bbox_iou(bbox, track["bbox"])
                if value >= best_iou:
                    best_iou, best_j = value, j
            if best_j >= 0:
                used.add(best_j)
                self._tracks[best_j]["bbox"] = bbox
                self._tracks[best_j]["misses"] = 0
                assigned[i] = self._tracks[best_j]["id"]
            else:
                track_id = self._next_id
                self._next_id += 1
                self._tracks.append({"id": track_id, "bbox": bbox, "misses": 0})
                assigned[i] = track_id
        for j, track in enumerate(self._tracks):
            if j not in used:
                track["misses"] += 1
        self._tracks = [t for t in self._tracks if t["misses"] <= self._max_misses]
        return assigned


def draw_detections(frame, detections: list[dict]):
    """Draw labeled boxes for persons and PPE violations onto a copy of the frame."""
    out = frame.copy()
    for det in detections:
        cls = det.get("class_name", "")
        bbox = det.get("bbox")
        if not bbox:
            continue
        conf = det.get("confidence", 0.0)
        x1, y1, x2, y2 = (int(v) for v in bbox)
        if cls == "person":
            color, label = COLOR_PERSON, f"kisi {conf:.2f}"
        elif cls.startswith("no_") or cls == "none_ppe":
            color, label = COLOR_VIOLATION, f"{cls} {conf:.2f}"
        else:
            color, label = COLOR_PPE_OK, f"{cls} {conf:.2f}"
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(out, (x1, max(0, y1 - th - 6)), (x1 + tw + 4, y1), color, -1)
        cv2.putText(out, label, (x1 + 2, max(10, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return out


def load_config(path: str) -> dict:
    file = Path(path)
    if not file.exists():
        print(f"Error: config file not found: {path}", file=sys.stderr)
        print("Copy connector_config.example.json to connector_config.json and fill it in.", file=sys.stderr)
        sys.exit(1)
    config = json.loads(file.read_text(encoding="utf-8"))
    for key in ("siteUrl", "ingestToken", "inferUrl", "cameras"):
        if not config.get(key):
            print(f"Error: config is missing '{key}'.", file=sys.stderr)
            sys.exit(1)
    return config


def grab_frame(source: str | int) -> "cv2.typing.MatLike | None":
    cap = cv2.VideoCapture(source)
    try:
        if not cap.isOpened():
            return None
        # Webcams need a few frames for auto-exposure to settle; the first
        # read right after opening is often near-black.
        warmup = 25 if isinstance(source, int) else 0
        for _ in range(warmup):
            cap.read()
            time.sleep(0.08)
        ok, frame = cap.read()
        return frame if ok else None
    finally:
        cap.release()


def infer_frame(infer_url: str, frame) -> dict | None:
    ok, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        return None
    try:
        response = requests.post(
            f"{infer_url.rstrip('/')}/infer",
            files={"image": ("frame.jpg", encoded.tobytes(), "image/jpeg")},
            timeout=REQUEST_TIMEOUT_SEC,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        print(f"  ! inference request failed: {exc}", file=sys.stderr)
        return None


def encode_snapshot(frame, max_width: int = 640, quality: int = 70) -> str | None:
    """Downscale + JPEG-encode the frame as base64 for the dashboard event card."""
    height, width = frame.shape[:2]
    if width > max_width:
        scale = max_width / width
        frame = cv2.resize(frame, (max_width, int(height * scale)))
    ok, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        return None
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def post_events(site_url: str, token: str, camera_code: str, events: list[dict], snapshot_base64: str | None = None) -> None:
    payload = {
        "cameraCode": camera_code,
        "snapshotBase64": snapshot_base64,
        "events": [
            {
                "eventType": event["event_type"],
                "confidence": event.get("confidence"),
                "timestamp": event.get("timestamp"),
                "message": event.get("message"),
                "metadata": event.get("metadata") or {},
            }
            for event in events
        ],
    }
    try:
        response = requests.post(
            f"{site_url.rstrip('/')}/api/events",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT_SEC,
        )
        response.raise_for_status()
        result = response.json()
        print(f"  -> sent {result.get('inserted', 0)} event(s) to dashboard ({camera_code})")
    except requests.RequestException as exc:
        print(f"  ! event upload failed: {exc}", file=sys.stderr)


def track_id_for_event(event: dict, person_bboxes: list[list[float]], track_ids: list[int]) -> int | None:
    """Map a PPE event back to the tracked person it was raised for."""
    person_bbox = (event.get("metadata") or {}).get("person_bbox")
    if person_bbox is None:
        return None
    for idx, bbox in enumerate(person_bboxes):
        if bbox == person_bbox:
            return track_ids[idx]
    return None


def run_pass(
    config: dict,
    cooldowns: dict[tuple, float],
    trackers: dict[str, PersonTracker],
) -> None:
    cooldown_sec = float(config.get("cooldownSec", DEFAULT_COOLDOWN_SEC))
    now = time.monotonic()

    for camera in config["cameras"]:
        code = camera["code"]
        source = camera["source"]
        print(f"[{code}] grabbing frame from {source}")

        frame = grab_frame(source)
        if frame is None:
            print(f"  ! could not read a frame from {source}", file=sys.stderr)
            continue

        result = infer_frame(config["inferUrl"], frame)
        if result is None:
            continue

        detections = result.get("detections", [])
        detected = result.get("events", [])
        print(f"  {len(detections)} detection(s), {len(detected)} rule event(s)")

        # Assign a stable id to each detected person for this camera.
        person_bboxes = [d["bbox"] for d in detections if d.get("class_name") == "person"]
        tracker = trackers.setdefault(code, PersonTracker())
        track_ids = tracker.update(person_bboxes)

        fresh: list[dict] = []
        for event in detected:
            tid = track_id_for_event(event, person_bboxes, track_ids)
            # Cooldown per (camera, tracked person, event type). Events not tied to
            # a person (fire/smoke) fall back to per-camera+type dedup.
            key = (code, tid, event["event_type"])
            last = cooldowns.get(key)
            if last is not None and (now - last) < cooldown_sec:
                continue
            cooldowns[key] = now
            fresh.append(event)

        if fresh:
            snapshot = encode_snapshot(draw_detections(frame, detections))
            post_events(config["siteUrl"], config["ingestToken"], code, fresh, snapshot)
        elif detected:
            print("  (all events still in cooldown window, nothing sent)")


def main() -> None:
    # Line-buffer stdout so logs are visible when piped/backgrounded.
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser(description="Luro Connector")
    parser.add_argument("--config", default="connector_config.json", help="Path to config JSON")
    parser.add_argument("--once", action="store_true", help="Run a single pass and exit")
    args = parser.parse_args()

    config = load_config(args.config)
    interval = float(config.get("intervalSec", DEFAULT_INTERVAL_SEC))
    cooldowns: dict[tuple, float] = {}
    trackers: dict[str, PersonTracker] = {}

    print(f"Luro Connector started — {len(config['cameras'])} camera(s), interval {interval}s")
    while True:
        run_pass(config, cooldowns, trackers)
        if args.once:
            break
        time.sleep(interval)


if __name__ == "__main__":
    main()
