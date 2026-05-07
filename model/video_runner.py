"""Run Luro safety pipeline on a video file and save annotated output.

Usage:
    cd model
    python video_runner.py --video "C:/path/input.mp4" --model models/luro_ppe.pt --save-video output_annotated.mp4
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2

from demo import draw_annotations
from inference.detector_bundle import stack_with_fire_smoke
from inference.pipeline import SafetyPipeline
from inference.schemas import Detection
from inference.yolo_detector import YoloDetector
from rules.rule_engine import RuleEngine
from rules.zones import Zone


def load_zones(path: str | None) -> list[Zone]:
    if not path:
        return []

    file = Path(path)
    if not file.exists():
        raise FileNotFoundError(f"Zones file not found: {path}")

    raw = json.loads(file.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Zones file must be a JSON array.")

    zones: list[Zone] = []
    for item in raw:
        polygon = [tuple(point) for point in item["polygon"]]
        zones.append(
            Zone(
                zone_id=item["zone_id"],
                name=item["name"],
                type=item["type"],
                polygon=polygon,
            )
        )
    return zones


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze a video with Luro safety pipeline")
    parser.add_argument(
        "--profile",
        choices=("default", "production_v1"),
        default="default",
        help="Preset profile for threshold and smoothing values",
    )
    parser.add_argument("--video", required=True, help="Input video path")
    parser.add_argument("--model", required=True, help="Path to YOLO .pt model")
    parser.add_argument("--save-video", required=True, help="Output annotated video path")
    parser.add_argument("--zones", help="Optional zones JSON file")
    parser.add_argument("--conf-threshold", type=float, default=0.40, help="YOLO confidence threshold")
    parser.add_argument(
        "--person-min-conf",
        type=float,
        default=0.50,
        help="Minimum confidence for person detections (default: 0.50)",
    )
    parser.add_argument(
        "--person-min-area",
        type=float,
        default=2500.0,
        help="Minimum bbox area in pixels for person detections (default: 2500)",
    )
    parser.add_argument(
        "--forklift-min-conf",
        type=float,
        default=None,
        help="Optional minimum confidence for forklift detections",
    )
    parser.add_argument(
        "--forklift-min-area",
        type=float,
        default=None,
        help="Optional minimum bbox area in pixels for forklift detections",
    )
    parser.add_argument(
        "--vest-min-conf",
        type=float,
        default=None,
        help="Optional minimum confidence for safety_vest detections",
    )
    parser.add_argument(
        "--vest-min-area",
        type=float,
        default=None,
        help="Optional minimum bbox area in pixels for safety_vest detections",
    )
    parser.add_argument(
        "--ppe-smooth-ttl",
        type=int,
        default=2,
        help="Carry hardhat/vest detections for N missing frames (default: 2)",
    )
    parser.add_argument(
        "--ppe-smooth-iou",
        type=float,
        default=0.25,
        help="IoU threshold for PPE temporal matching (default: 0.25)",
    )
    parser.add_argument("--stride", type=int, default=1, help="Analyze every Nth frame (default: 1)")
    parser.add_argument("--show", action="store_true", help="Show annotated frames while processing")
    parser.add_argument(
        "--fire-smoke-model",
        default=None,
        help="Optional second YOLO weights for fire/smoke (e.g. models/luro_fire_smoke.pt)",
    )
    parser.add_argument("--fire-smoke-conf", type=float, default=0.28)
    parser.add_argument("--fire-smoke-min-area", type=float, default=400.0)
    return parser.parse_args()


def apply_profile_overrides(args: argparse.Namespace) -> None:
    if args.profile != "production_v1":
        return

    args.conf_threshold = 0.30
    args.person_min_conf = 0.58
    args.person_min_area = 4000.0
    args.forklift_min_conf = 0.80
    args.forklift_min_area = 28000.0
    args.vest_min_conf = 0.62
    args.vest_min_area = 1800.0
    args.ppe_smooth_ttl = 3
    args.ppe_smooth_iou = 0.20


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


def smooth_ppe_detections(
    detections: list[Detection],
    cache: dict[str, list[dict[str, float | list[float] | int]]],
    ttl: int,
    iou_threshold: float,
) -> list[Detection]:
    if ttl <= 0:
        return detections

    keep_classes = ("hardhat", "safety_vest")
    augmented = list(detections)

    for class_name in keep_classes:
        current = [d for d in detections if d.class_name == class_name]
        previous = cache.get(class_name, [])
        matched_prev: set[int] = set()
        next_cache: list[dict[str, float | list[float] | int]] = []

        for det in current:
            best_idx = -1
            best_iou = 0.0
            for idx, prev in enumerate(previous):
                iou_val = bbox_iou(det.bbox, prev["bbox"])  # type: ignore[index]
                if iou_val > best_iou:
                    best_iou = iou_val
                    best_idx = idx
            if best_idx >= 0 and best_iou >= iou_threshold:
                matched_prev.add(best_idx)
            next_cache.append({"bbox": det.bbox, "confidence": det.confidence, "ttl": ttl})

        for idx, prev in enumerate(previous):
            if idx in matched_prev:
                continue
            prev_ttl = int(prev["ttl"])  # type: ignore[index]
            if prev_ttl <= 0:
                continue
            carried_conf = max(0.20, float(prev["confidence"]) * 0.92)  # type: ignore[index]
            carried_bbox = [float(v) for v in prev["bbox"]]  # type: ignore[index]
            augmented.append(
                Detection(
                    class_name=class_name,
                    confidence=round(carried_conf, 4),
                    bbox=[round(v, 2) for v in carried_bbox],
                    track_id=None,
                )
            )
            next_cache.append({"bbox": carried_bbox, "confidence": carried_conf, "ttl": prev_ttl - 1})

        cache[class_name] = next_cache

    return augmented


def main() -> None:
    args = parse_args()
    apply_profile_overrides(args)

    video_path = Path(args.video)
    if not video_path.exists():
        print(f"Error: input video not found: {video_path}", file=sys.stderr)
        sys.exit(1)

    model_path = Path(args.model)
    if not model_path.exists():
        print(f"Error: model file not found: {model_path}", file=sys.stderr)
        sys.exit(1)

    if args.stride < 1:
        print("Error: --stride must be >= 1", file=sys.stderr)
        sys.exit(1)

    try:
        zones = load_zones(args.zones)
    except Exception as exc:
        print(f"Error loading zones: {exc}", file=sys.stderr)
        sys.exit(1)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"Error: cannot open video: {video_path}", file=sys.stderr)
        sys.exit(1)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    out_path = Path(args.save_video)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(out_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        print(f"Error: cannot create output video: {out_path}", file=sys.stderr)
        cap.release()
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

    frame_index = 0
    analyzed_count = 0
    event_count = 0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frame_index += 1
            if frame_index % args.stride != 0:
                writer.write(frame)
                continue

            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            result = pipeline.analyze(
                image=frame,
                timestamp=timestamp,
                zones=zones if zones else None,
            )
            result.detections = smooth_ppe_detections(
                detections=result.detections,
                cache=ppe_cache,
                ttl=args.ppe_smooth_ttl,
                iou_threshold=args.ppe_smooth_iou,
            )
            result.events = rule_engine.generate_events(
                result.detections,
                zones,
                timestamp,
                image_width=result.image_width,
            )

            analyzed_count += 1
            event_count += len(result.events)
            annotated = draw_annotations(frame, result, zones)
            writer.write(annotated)

            if args.show:
                cv2.imshow("Luro Video Analysis", annotated)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            if analyzed_count % 30 == 0:
                print(
                    f"Processed frames: {frame_index}/{total_frames if total_frames > 0 else '?'} | "
                    f"analyzed: {analyzed_count} | total events: {event_count}"
                )
    finally:
        cap.release()
        writer.release()
        if args.show:
            cv2.destroyAllWindows()

    print(f"\nDone.")
    print(f"Input video : {video_path}")
    print(f"Output video: {out_path}")
    print(f"Frames read : {frame_index}")
    print(f"Frames analyzed: {analyzed_count} (stride={args.stride})")
    print(f"Total events: {event_count}")


if __name__ == "__main__":
    main()
