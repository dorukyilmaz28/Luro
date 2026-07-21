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
import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont

DEFAULT_INTERVAL_SEC = 5
DEFAULT_COOLDOWN_SEC = 60
REQUEST_TIMEOUT_SEC = 30
TRACK_IOU_THRESHOLD = 0.4
TRACK_MAX_MISSES = 3

# Modern annotation palette (RGB). Sky blue for people, rose for violations.
CLR_PERSON = (56, 189, 248)      # sky-400
CLR_VIOLATION = (244, 63, 94)    # rose-500
CLR_TEXT = (255, 255, 255)

# Human-readable Turkish labels for the on-image violation chips.
VIOLATION_LABELS_TR = {
    "no_hardhat": "Baret yok",
    "no_vest": "Yelek yok",
    "no_safety_vest": "Yelek yok",
    "no_safety_gloves": "Eldiven yok",
    "no_safety_boots": "Bot yok",
    "no_safety_goggles": "Gözlük yok",
    "none_ppe": "Ekipman yok",
}


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


def _load_font(size: int):
    for path in ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _draw_corner_box(draw: "ImageDraw.ImageDraw", box, color, width: int) -> None:
    """HUD-style box: only the four corner brackets, not a full rectangle."""
    x1, y1, x2, y2 = box
    length = max(14, int(min(x2 - x1, y2 - y1) * 0.22))
    rgba = color + (255,)
    for cx, cy, sx, sy in ((x1, y1, 1, 1), (x2, y1, -1, 1), (x1, y2, 1, -1), (x2, y2, -1, -1)):
        draw.line([(cx, cy), (cx + sx * length, cy)], fill=rgba, width=width)
        draw.line([(cx, cy), (cx, cy + sy * length)], fill=rgba, width=width)


def _draw_chip(draw: "ImageDraw.ImageDraw", anchor, text: str, color, font) -> None:
    """Rounded pill label above the box."""
    x1, y1 = anchor
    tb = draw.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    pad_x, pad_y = 10, 6
    pill_w, pill_h = tw + pad_x * 2, th + pad_y * 2
    px = x1
    py = y1 - pill_h - 5
    if py < 0:
        py = y1 + 5
    draw.rounded_rectangle([px, py, px + pill_w, py + pill_h], radius=pill_h // 2, fill=color + (235,))
    draw.text((px + pad_x, py + pill_h // 2), text, font=font, fill=CLR_TEXT + (255,), anchor="lm")


def draw_detections(frame, detections: list[dict], zones: list[dict] | None = None):
    """Draw a modern HUD-style overlay: corner-bracket boxes + rounded label chips.

    Only people and PPE violations are drawn (present-PPE boxes are omitted to
    keep the frame clean). Rendered with PIL for crisp, Unicode-capable text.
    """
    base = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    font = _load_font(max(15, base.size[0] // 40))

    # Draw restricted zones (pixel-space polygons) beneath the detections.
    for zone in zones or []:
        polygon = zone.get("polygon") or []
        if len(polygon) < 3:
            continue
        pts = [(float(x), float(y)) for x, y in polygon]
        draw.polygon(pts, fill=CLR_VIOLATION + (40,), outline=CLR_VIOLATION + (220,), width=2)
        zname = zone.get("name")
        if zname:
            _draw_chip(draw, (int(pts[0][0]), int(pts[0][1])), str(zname), CLR_VIOLATION, font)

    def pct(det: dict) -> str:
        conf = det.get("confidence")
        return f"  %{int(conf * 100)}" if isinstance(conf, (int, float)) else ""

    for det in detections:
        cls = det.get("class_name", "")
        bbox = det.get("bbox")
        if not bbox:
            continue
        box = tuple(int(v) for v in bbox)
        is_violation = cls.startswith("no_") or cls == "none_ppe"
        if cls == "person":
            _draw_corner_box(draw, box, CLR_PERSON, width=3)
            _draw_chip(draw, (box[0], box[1]), f"Kişi{pct(det)}", CLR_PERSON, font)
        elif is_violation:
            # Soft translucent red fill to draw the eye to the violation.
            draw.rectangle(box, fill=CLR_VIOLATION + (38,))
            _draw_corner_box(draw, box, CLR_VIOLATION, width=3)
            label = VIOLATION_LABELS_TR.get(cls, cls)
            _draw_chip(draw, (box[0], box[1]), f"{label}{pct(det)}", CLR_VIOLATION, font)

    composited = Image.alpha_composite(base, overlay).convert("RGB")
    return cv2.cvtColor(np.array(composited), cv2.COLOR_RGB2BGR)


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


def fetch_zones(site_url: str, token: str, camera_code: str) -> list[dict]:
    """Fetch a camera's restricted zones (normalized 0..1 polygons) from the dashboard."""
    try:
        response = requests.get(
            f"{site_url.rstrip('/')}/api/zones",
            params={"cameraCode": camera_code},
            headers={"Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT_SEC,
        )
        response.raise_for_status()
        return response.json().get("zones", [])
    except requests.RequestException:
        return []


def scale_zones(zones: list[dict], width: int, height: int) -> list[dict]:
    """Convert normalized (0..1) zone polygons to pixel coords for the inference frame."""
    scaled = []
    for z in zones:
        polygon = z.get("polygon") or []
        pixel_poly = [[float(x) * width, float(y) * height] for x, y in polygon]
        if len(pixel_poly) >= 3:
            scaled.append({**z, "polygon": pixel_poly})
    return scaled


def infer_frame(infer_url: str, frame, zones: list[dict] | None = None) -> dict | None:
    ok, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        return None
    data = {"zones": json.dumps(zones)} if zones else None
    try:
        response = requests.post(
            f"{infer_url.rstrip('/')}/infer",
            files={"image": ("frame.jpg", encoded.tobytes(), "image/jpeg")},
            data=data,
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

        height, width = frame.shape[:2]
        raw_zones = fetch_zones(config["siteUrl"], config["ingestToken"], code)
        zones = scale_zones(raw_zones, width, height)
        if zones:
            print(f"  {len(zones)} restricted zone(s) active")

        result = infer_frame(config["inferUrl"], frame, zones=zones)
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
            snapshot = encode_snapshot(draw_detections(frame, detections, zones))
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
