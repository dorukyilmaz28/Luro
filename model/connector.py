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
import json
import sys
import time
from pathlib import Path

import cv2
import requests

DEFAULT_INTERVAL_SEC = 5
DEFAULT_COOLDOWN_SEC = 60
REQUEST_TIMEOUT_SEC = 30


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


def post_events(site_url: str, token: str, camera_code: str, events: list[dict]) -> None:
    payload = {
        "cameraCode": camera_code,
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


def run_pass(config: dict, cooldowns: dict[tuple[str, str], float]) -> None:
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

        detected = result.get("events", [])
        print(f"  {len(result.get('detections', []))} detection(s), {len(detected)} rule event(s)")

        fresh: list[dict] = []
        for event in detected:
            key = (code, event["event_type"])
            last = cooldowns.get(key)
            if last is not None and (now - last) < cooldown_sec:
                continue
            cooldowns[key] = now
            fresh.append(event)

        if fresh:
            post_events(config["siteUrl"], config["ingestToken"], code, fresh)
        elif detected:
            print("  (all events still in cooldown window, nothing sent)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Luro Connector")
    parser.add_argument("--config", default="connector_config.json", help="Path to config JSON")
    parser.add_argument("--once", action="store_true", help="Run a single pass and exit")
    args = parser.parse_args()

    config = load_config(args.config)
    interval = float(config.get("intervalSec", DEFAULT_INTERVAL_SEC))
    cooldowns: dict[tuple[str, str], float] = {}

    print(f"Luro Connector started — {len(config['cameras'])} camera(s), interval {interval}s")
    while True:
        run_pass(config, cooldowns)
        if args.once:
            break
        time.sleep(interval)


if __name__ == "__main__":
    main()
