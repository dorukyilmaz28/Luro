"""Run Luro safety pipeline on a live camera stream (RTSP or webcam).

Usage:
    cd model
    python camera_runner.py --profile production_v1 --source 0 --model models/luro_ppe_v2.pt --show
    python camera_runner.py --profile production_v1 --source "rtsp://user:pass@ip:554/stream" --model models/luro_ppe_v2.pt --show
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import cv2

from demo import draw_annotations
from inference.detector_bundle import stack_with_fire_smoke
from inference.pipeline import SafetyPipeline
from inference.schemas import Detection, Event
from inference.yolo_detector import YoloDetector
from rules.rule_engine import RuleEngine
from video_runner import apply_profile_overrides, load_zones, smooth_ppe_detections


def parse_source(source: str) -> int | str:
    return int(source) if source.isdigit() else source


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze live camera stream with Luro safety pipeline")
    parser.add_argument(
        "--profile",
        choices=("default", "production_v1"),
        default="production_v1",
        help="Preset profile for threshold and smoothing values",
    )
    parser.add_argument("--source", required=True, help="Camera source index (0) or RTSP URL")
    parser.add_argument("--model", required=True, help="Path to YOLO .pt model")
    parser.add_argument("--zones", help="Optional zones JSON file")
    parser.add_argument("--show", action="store_true", help="Show annotated live output window")
    parser.add_argument("--save-video", help="Optional output video path for recording")
    parser.add_argument("--conf-threshold", type=float, default=0.40, help="YOLO confidence threshold")
    parser.add_argument("--person-min-conf", type=float, default=0.50)
    parser.add_argument("--person-min-area", type=float, default=2500.0)
    parser.add_argument("--forklift-min-conf", type=float, default=None)
    parser.add_argument("--forklift-min-area", type=float, default=None)
    parser.add_argument("--vest-min-conf", type=float, default=None)
    parser.add_argument("--vest-min-area", type=float, default=None)
    parser.add_argument("--ppe-smooth-ttl", type=int, default=2)
    parser.add_argument("--ppe-smooth-iou", type=float, default=0.25)
    parser.add_argument("--stride", type=int, default=1, help="Analyze every Nth frame")
    parser.add_argument("--reconnect-delay-sec", type=float, default=2.0, help="Delay before reconnect")
    parser.add_argument("--max-reconnects", type=int, default=20, help="Maximum reconnect attempts")
    parser.add_argument("--max-frames", type=int, default=0, help="Stop after N frames (0 = unlimited)")
    parser.add_argument("--confirm-frames", type=int, default=3, help="Require event seen in N consecutive frames")
    parser.add_argument("--summary-json", help="Optional path to write run summary as JSON")
    parser.add_argument("--summary-csv", help="Optional path to write event counts as CSV")
    parser.add_argument(
        "--fire-smoke-model",
        default=None,
        help="Optional YOLO weights for fire/smoke (e.g. models/luro_fire_smoke.pt)",
    )
    parser.add_argument("--fire-smoke-conf", type=float, default=0.28)
    parser.add_argument("--fire-smoke-min-area", type=float, default=400.0)
    return parser.parse_args()


def open_capture(source: int | str) -> cv2.VideoCapture:
    return cv2.VideoCapture(source)


def bbox_iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    iw = max(0.0, inter_x2 - inter_x1)
    ih = max(0.0, inter_y2 - inter_y1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    denom = area_a + area_b - inter
    return inter / denom if denom > 0 else 0.0


class SimpleIoUTracker:
    def __init__(self, iou_threshold: float = 0.35, ttl: int = 20) -> None:
        self._iou_threshold = iou_threshold
        self._ttl = ttl
        self._next_id = 1
        self._tracks: list[dict] = []

    def assign(self, detections: list[Detection]) -> list[Detection]:
        updated: list[Detection] = []
        used_track_indices: set[int] = set()

        for det in detections:
            best_idx = -1
            best_iou = 0.0
            for idx, track in enumerate(self._tracks):
                if idx in used_track_indices:
                    continue
                if track["class_name"] != det.class_name:
                    continue
                iou_val = bbox_iou(det.bbox, track["bbox"])
                if iou_val > best_iou:
                    best_iou = iou_val
                    best_idx = idx

            if best_idx >= 0 and best_iou >= self._iou_threshold:
                track = self._tracks[best_idx]
                track["bbox"] = det.bbox
                track["ttl"] = self._ttl
                used_track_indices.add(best_idx)
                track_id = int(track["id"])
            else:
                track_id = self._next_id
                self._next_id += 1
                self._tracks.append(
                    {"id": track_id, "class_name": det.class_name, "bbox": det.bbox, "ttl": self._ttl}
                )

            updated.append(
                Detection(
                    class_name=det.class_name,
                    confidence=det.confidence,
                    bbox=det.bbox,
                    track_id=track_id,
                )
            )

        for track in self._tracks:
            track["ttl"] -= 1
        self._tracks = [t for t in self._tracks if t["ttl"] > 0]
        return updated


def _closest_track_id(target_bbox: list[float], class_name: str, detections: list[Detection]) -> int | None:
    best_id: int | None = None
    best_iou = 0.0
    for det in detections:
        if det.class_name != class_name or det.track_id is None:
            continue
        iou_val = bbox_iou(target_bbox, det.bbox)
        if iou_val > best_iou:
            best_iou = iou_val
            best_id = det.track_id
    return best_id


def _event_key(event: Event, detections: list[Detection]) -> str:
    meta = event.metadata or {}
    if event.event_type == "fire_smoke":
        db = meta.get("detection_bbox")
        hc = str(meta.get("hazard_class", ""))
        if isinstance(db, list) and len(db) == 4:
            return f"fire_smoke:{hc}:{int(db[0])}:{int(db[1])}:{int(db[2])}:{int(db[3])}"
        return f"fire_smoke:{hc}:na"

    person_bbox = meta.get("person_bbox")
    vehicle_bbox = meta.get("vehicle_bbox")
    zone_id = str(meta.get("zone_id", "na"))

    if isinstance(person_bbox, list):
        person_track_id = _closest_track_id([float(v) for v in person_bbox], "person", detections)
        if person_track_id is not None:
            if isinstance(vehicle_bbox, list):
                vehicle_track_id = _closest_track_id([float(v) for v in vehicle_bbox], "forklift", detections)
                return f"{event.event_type}:p{person_track_id}:v{vehicle_track_id or 'na'}:{zone_id}"
            return f"{event.event_type}:p{person_track_id}:{zone_id}"

    return f"{event.event_type}:fallback:{zone_id}"


def confirm_events(
    events: list[Event],
    detections: list[Detection],
    state: dict[str, int],
    required_frames: int,
) -> list[Event]:
    if required_frames <= 1:
        return events

    current_keys: set[str] = set()
    confirmed: list[Event] = []

    for event in events:
        key = _event_key(event, detections)
        current_keys.add(key)
        new_count = state.get(key, 0) + 1
        state[key] = new_count
        if new_count >= required_frames:
            confirmed.append(event)

    stale = [k for k in state if k not in current_keys]
    for k in stale:
        del state[k]

    return confirmed


def main() -> None:
    args = parse_args()
    apply_profile_overrides(args)

    model_path = Path(args.model)
    if not model_path.exists():
        print(f"Error: model file not found: {model_path}", file=sys.stderr)
        sys.exit(1)
    if args.stride < 1:
        print("Error: --stride must be >= 1", file=sys.stderr)
        sys.exit(1)
    if args.confirm_frames < 1:
        print("Error: --confirm-frames must be >= 1", file=sys.stderr)
        sys.exit(1)

    try:
        zones = load_zones(args.zones)
    except Exception as exc:
        print(f"Error loading zones: {exc}", file=sys.stderr)
        sys.exit(1)

    class_conf_thresholds: dict[str, float] = {"person": args.person_min_conf}
    class_min_area_px: dict[str, float] = {"person": args.person_min_area}
    if args.forklift_min_conf is not None:
        class_conf_thresholds["forklift"] = args.forklift_min_conf
    if args.forklift_min_area is not None:
        class_min_area_px["forklift"] = args.forklift_min_area
    if args.vest_min_conf is not None:
        class_conf_thresholds["safety_vest"] = args.vest_min_conf
    if args.vest_min_area is not None:
        class_min_area_px["safety_vest"] = args.vest_min_area

    base_detector = YoloDetector(
        model_path=str(model_path),
        confidence_threshold=args.conf_threshold,
        class_conf_thresholds=class_conf_thresholds,
        class_min_area_px=class_min_area_px,
    )
    detector = stack_with_fire_smoke(
        base_detector,
        args.fire_smoke_model,
        fire_smoke_conf=args.fire_smoke_conf,
        fire_smoke_min_area=args.fire_smoke_min_area,
    )
    pipeline = SafetyPipeline(detector=detector)
    rule_engine = RuleEngine()
    ppe_cache: dict[str, list[dict[str, float | list[float] | int]]] = {}
    tracker = SimpleIoUTracker()
    event_confirm_state: dict[str, int] = {}
    event_type_counts: dict[str, int] = defaultdict(int)

    source = parse_source(args.source)
    reconnects = 0
    frame_index = 0
    analyzed_count = 0
    total_events = 0
    writer: cv2.VideoWriter | None = None
    show_enabled = args.show

    cap = open_capture(source)
    if not cap.isOpened():
        print(f"Error: cannot open source: {args.source}", file=sys.stderr)
        sys.exit(1)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                reconnects += 1
                if reconnects > args.max_reconnects:
                    print("Stream disconnected and max reconnects reached.")
                    break
                cap.release()
                time.sleep(args.reconnect_delay_sec)
                cap = open_capture(source)
                continue

            reconnects = 0
            frame_index += 1

            if writer is None and args.save_video:
                out = Path(args.save_video)
                out.parent.mkdir(parents=True, exist_ok=True)
                fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                h, w = frame.shape[:2]
                writer = cv2.VideoWriter(str(out), cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

            if frame_index % args.stride != 0:
                if writer is not None:
                    writer.write(frame)
                continue

            ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            result = pipeline.analyze(image=frame, timestamp=ts, zones=zones if zones else None)
            result.detections = smooth_ppe_detections(
                detections=result.detections,
                cache=ppe_cache,
                ttl=args.ppe_smooth_ttl,
                iou_threshold=args.ppe_smooth_iou,
            )
            result.detections = tracker.assign(result.detections)
            result.events = rule_engine.generate_events(
                result.detections,
                zones,
                ts,
                image_width=result.image_width,
            )
            result.events = confirm_events(
                result.events,
                result.detections,
                event_confirm_state,
                args.confirm_frames,
            )

            analyzed_count += 1
            total_events += len(result.events)
            for evt in result.events:
                event_type_counts[evt.event_type] += 1
            annotated = draw_annotations(frame, result, zones)

            if writer is not None:
                writer.write(annotated)
            if show_enabled:
                try:
                    cv2.imshow("Luro Camera Analysis", annotated)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                except cv2.error as exc:
                    print(f"Warning: GUI preview disabled ({exc}). Continuing without --show.")
                    show_enabled = False

            if analyzed_count % 30 == 0:
                print(f"Frames: {frame_index} | analyzed: {analyzed_count} | total events: {total_events}")

            if args.max_frames > 0 and frame_index >= args.max_frames:
                break
    finally:
        cap.release()
        if writer is not None:
            writer.release()
        if show_enabled:
            try:
                cv2.destroyAllWindows()
            except cv2.error:
                pass

    print("Done.")
    print(f"Frames read: {frame_index}")
    print(f"Frames analyzed: {analyzed_count}")
    print(f"Total events: {total_events}")
    if event_type_counts:
        print("Event breakdown:")
        for event_type in sorted(event_type_counts):
            print(f"  {event_type}: {event_type_counts[event_type]}")

    if args.summary_json:
        summary_json_path = Path(args.summary_json)
        summary_json_path.parent.mkdir(parents=True, exist_ok=True)
        summary_payload = {
            "timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": args.source,
            "model": str(model_path),
            "profile": args.profile,
            "frames_read": frame_index,
            "frames_analyzed": analyzed_count,
            "total_events": total_events,
            "event_counts": dict(sorted(event_type_counts.items())),
        }
        summary_json_path.write_text(json.dumps(summary_payload, indent=2), encoding="utf-8")
        print(f"Summary JSON written to {summary_json_path}")

    if args.summary_csv:
        summary_csv_path = Path(args.summary_csv)
        summary_csv_path.parent.mkdir(parents=True, exist_ok=True)
        with summary_csv_path.open("w", newline="", encoding="utf-8") as f:
            writer_csv = csv.writer(f)
            writer_csv.writerow(["event_type", "count"])
            for event_type, count in sorted(event_type_counts.items()):
                writer_csv.writerow([event_type, count])
        print(f"Summary CSV written to {summary_csv_path}")


if __name__ == "__main__":
    main()
