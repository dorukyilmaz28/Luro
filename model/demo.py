"""Luro AI Safety Pipeline â€” Demo Runner

Run the safety pipeline from the command line using mock scenarios
or real YOLO inference with optional zone configuration.

Usage (mock):
    cd model
    python demo.py --scenario no_hardhat --pretty
    python demo.py --scenario proximity --zones examples/sample_zones.json --pretty

Usage (YOLO):
    python demo.py --image samples/test.jpg --use-yolo --model-path models/yolo.pt --pretty
    python demo.py --image samples/test.jpg --use-yolo --model-path models/luro_ppe_v2.pt --fire-smoke-model models/luro_fire_smoke.pt --pretty
    python demo.py --scenario fire_smoke --pretty
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from inference.detector_bundle import stack_with_fire_smoke
from inference.mock_detector import MockDetector
from inference.pipeline import SafetyPipeline
from inference.schemas import Detection, Event, FrameAnalysisResult
from inference.yolo_detector import YoloDetector
from rules.zones import Zone

VALID_SCENARIOS = ("no_hardhat", "no_vest", "proximity", "restricted_zone", "fire_smoke")


def load_zones(path: str) -> list[Zone]:
    file = Path(path)
    if not file.exists():
        print(f"Error: zones file not found: {path}", file=sys.stderr)
        sys.exit(1)

    try:
        raw = json.loads(file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"Error: invalid JSON in zones file: {exc}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(raw, list):
        print("Error: zones file must contain a JSON array", file=sys.stderr)
        sys.exit(1)

    zones: list[Zone] = []
    for i, entry in enumerate(raw):
        try:
            polygon = [tuple(pt) for pt in entry.get("polygon", [])]
            zones.append(
                Zone(
                    zone_id=entry["zone_id"],
                    name=entry["name"],
                    type=entry["type"],
                    polygon=polygon,
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            print(f"Error: invalid zone at index {i}: {exc}", file=sys.stderr)
            sys.exit(1)

    return zones


def load_image(path: str) -> Any:
    from utils.image_utils import load_image as _load

    try:
        return _load(path)
    except FileNotFoundError:
        print(f"Error: image file not found: {path}", file=sys.stderr)
        sys.exit(1)


def print_pretty(result: FrameAnalysisResult, detector_label: str) -> None:
    header = "Luro AI Safety Pipeline â€” Analysis Result"
    print(f"\n{'=' * len(header)}")
    print(header)
    print(f"{'=' * len(header)}")

    print(f"  Detector   : {detector_label}")
    print(f"  Timestamp  : {result.timestamp}")
    print(f"  Image size : {result.image_width} x {result.image_height}")
    print(f"  Detections : {len(result.detections)}")
    print(f"  Events     : {len(result.events)}")

    print(f"\n--- DETECTIONS ({len(result.detections)}) ---")
    for i, det in enumerate(result.detections, 1):
        tid = f"  track_id={det.track_id}" if det.track_id is not None else ""
        print(f"  [{i}] {det.class_name}  conf={det.confidence:.2f}  bbox={det.bbox}{tid}")

    print(f"\n--- EVENTS ({len(result.events)}) ---")
    if not result.events:
        print("  (none)")
    for i, evt in enumerate(result.events, 1):
        print(f"  [{i}] {evt.event_type}  conf={evt.confidence:.2f}")
        print(f"      {evt.message}")
        if evt.metadata:
            print(f"      metadata={evt.metadata}")

    print()


CLASS_COLORS: dict[str, tuple[int, int, int]] = {
    "person": (0, 200, 0),
    "forklift": (200, 120, 0),
    "machinery": (200, 120, 0),
    "vehicle": (200, 120, 0),
    "hardhat": (0, 220, 220),
    "safety_vest": (220, 200, 0),
    "safety_gloves": (220, 160, 40),
    "safety_boots": (180, 90, 200),
    "safety_goggles": (0, 160, 255),
    "no_hardhat": (0, 0, 220),
    "no_safety_vest": (0, 0, 220),
    "no_safety_gloves": (0, 0, 220),
    "no_safety_boots": (0, 0, 220),
    "no_safety_goggles": (0, 0, 220),
    "fire": (0, 69, 255),
    "smoke": (160, 160, 160),
}
VIOLATION_COLOR = (0, 0, 230)
ZONE_COLOR = (0, 0, 200)
STATUS_OK_COLOR = (30, 180, 30)
STATUS_BAD_COLOR = (0, 0, 220)
PANEL_BG_COLOR = (28, 28, 28)
PANEL_TEXT_COLOR = (235, 235, 235)

STATUS_ROWS: tuple[tuple[str, str], ...] = (
    ("hardhat", "Hardhat"),
    ("safety_vest", "Safety Vest"),
    ("safety_gloves", "Gloves"),
    ("safety_boots", "Boots"),
    ("safety_goggles", "Goggles"),
    ("restricted_zone", "Restricted Zone"),
    ("unsafe_proximity", "Unsafe Proximity"),
    ("fall", "Fall"),
)


def _scale_font(img_w: int) -> tuple[float, int]:
    if img_w > 2000:
        return 0.7, 2
    if img_w > 1200:
        return 0.55, 1
    return 0.45, 1


def _bbox_close(a: list[float], b: list[float], tol: float = 3.0) -> bool:
    if len(a) != 4 or len(b) != 4:
        return False
    return all(abs(float(av) - float(bv)) <= tol for av, bv in zip(a, b))


def _event_bbox(event: Event, key: str) -> list[float] | None:
    bbox = event.metadata.get(key)
    if not isinstance(bbox, list) or len(bbox) != 4:
        return None
    return [float(v) for v in bbox]


def _person_status_map(person: Detection, events: list[Event]) -> dict[str, bool]:
    status = {
        "hardhat": True,
        "safety_vest": True,
        "safety_gloves": True,
        "safety_boots": True,
        "safety_goggles": True,
        "restricted_zone": True,
        "unsafe_proximity": True,
        "fall": True,
    }

    for evt in events:
        if evt.event_type in ("no_hardhat",):
            person_bbox = _event_bbox(evt, "person_bbox")
            if person_bbox and _bbox_close(person.bbox, person_bbox):
                status["hardhat"] = False
        elif evt.event_type in ("no_vest", "no_safety_vest"):
            person_bbox = _event_bbox(evt, "person_bbox")
            if person_bbox and _bbox_close(person.bbox, person_bbox):
                status["safety_vest"] = False
        elif evt.event_type == "no_safety_gloves":
            person_bbox = _event_bbox(evt, "person_bbox")
            if person_bbox and _bbox_close(person.bbox, person_bbox):
                status["safety_gloves"] = False
        elif evt.event_type == "no_safety_boots":
            person_bbox = _event_bbox(evt, "person_bbox")
            if person_bbox and _bbox_close(person.bbox, person_bbox):
                status["safety_boots"] = False
        elif evt.event_type == "no_safety_goggles":
            person_bbox = _event_bbox(evt, "person_bbox")
            if person_bbox and _bbox_close(person.bbox, person_bbox):
                status["safety_goggles"] = False
        elif evt.event_type == "restricted_zone_entry":
            # Restricted-zone event stores the violating detection bbox.
            det_bbox = _event_bbox(evt, "detection_bbox")
            if det_bbox and _bbox_close(person.bbox, det_bbox):
                status["restricted_zone"] = False
        elif evt.event_type == "unsafe_proximity":
            person_bbox = _event_bbox(evt, "person_bbox")
            if person_bbox and _bbox_close(person.bbox, person_bbox):
                status["unsafe_proximity"] = False
        elif evt.event_type == "person_fall_suspected":
            person_bbox = _event_bbox(evt, "person_bbox")
            if person_bbox and _bbox_close(person.bbox, person_bbox):
                status["fall"] = False

    return status


def _draw_person_status_panel(
    canvas: Any,
    person: Detection,
    person_index: int,
    statuses: dict[str, bool],
    font_scale: float,
    font_thick: int,
    occupied_panels: list[tuple[int, int, int, int]],
) -> None:
    import cv2

    img_h, img_w = canvas.shape[:2]
    x1, y1, x2, _ = [int(v) for v in person.bbox]

    row_gap = 6
    panel_pad = 8
    label_widths: list[int] = []
    row_height = 0
    title = f"Person {person_index}"
    (title_w, title_h), _ = cv2.getTextSize(title, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick + 1)

    for _, label in STATUS_ROWS:
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick)
        label_widths.append(tw)
        row_height = max(row_height, th + 6)

    max_label_w = max(label_widths) if label_widths else 110
    state_col_w = 34
    panel_w = max(panel_pad * 2 + max_label_w + state_col_w + 12, panel_pad * 2 + title_w + 6)
    panel_h = (
        panel_pad * 2
        + title_h
        + 4
        + len(STATUS_ROWS) * row_height
        + (len(STATUS_ROWS) - 1) * row_gap
    )

    def _overlaps_existing(px: int, py: int) -> bool:
        ax1, ay1, ax2, ay2 = px, py, px + panel_w, py + panel_h
        for bx1, by1, bx2, by2 in occupied_panels:
            if not (ax2 <= bx1 or bx2 <= ax1 or ay2 <= by1 or by2 <= ay1):
                return True
        return False

    # Prefer right side of person, fallback left side or lower area.
    candidates: list[tuple[int, int]] = []
    right_x = min(max(2, x2 + 8), max(2, img_w - panel_w - 2))
    left_x = min(max(2, x1 - panel_w - 8), max(2, img_w - panel_w - 2))
    base_y = min(max(2, y1), max(2, img_h - panel_h - 2))
    candidates.append((right_x, base_y))
    candidates.append((left_x, base_y))

    # If nearby panels overlap, shift down by panel height steps.
    step = max(panel_h // 2, 24)
    for offset in range(step, img_h, step):
        down_y = min(max(2, base_y + offset), max(2, img_h - panel_h - 2))
        up_y = min(max(2, base_y - offset), max(2, img_h - panel_h - 2))
        candidates.append((right_x, down_y))
        candidates.append((left_x, down_y))
        candidates.append((right_x, up_y))
        candidates.append((left_x, up_y))

    panel_x, panel_y = candidates[0]
    for cand_x, cand_y in candidates:
        if not _overlaps_existing(cand_x, cand_y):
            panel_x, panel_y = cand_x, cand_y
            break

    occupied_panels.append((panel_x, panel_y, panel_x + panel_w, panel_y + panel_h))

    cv2.rectangle(
        canvas,
        (panel_x, panel_y),
        (panel_x + panel_w, panel_y + panel_h),
        PANEL_BG_COLOR,
        -1,
        cv2.LINE_AA,
    )
    cv2.rectangle(
        canvas,
        (panel_x, panel_y),
        (panel_x + panel_w, panel_y + panel_h),
        (85, 85, 85),
        1,
        cv2.LINE_AA,
    )

    title_y = panel_y + panel_pad + title_h
    cv2.putText(
        canvas,
        title,
        (panel_x + panel_pad, title_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        (255, 255, 255),
        font_thick + 1,
        cv2.LINE_AA,
    )

    cy = title_y + 4 + row_height
    for key, label in STATUS_ROWS:
        is_ok = statuses.get(key, True)
        state_mark = "OK" if is_ok else "X"
        state_color = STATUS_OK_COLOR if is_ok else STATUS_BAD_COLOR

        cv2.putText(
            canvas,
            label,
            (panel_x + panel_pad, cy),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            PANEL_TEXT_COLOR,
            font_thick,
            cv2.LINE_AA,
        )
        mark_scale = max(0.35, font_scale)
        (mw, _), _ = cv2.getTextSize(state_mark, cv2.FONT_HERSHEY_SIMPLEX, mark_scale, font_thick + 1)
        mark_x = panel_x + panel_w - panel_pad - mw
        cv2.putText(
            canvas,
            state_mark,
            (mark_x, cy),
            cv2.FONT_HERSHEY_SIMPLEX,
            mark_scale,
            state_color,
            font_thick + 1,
            cv2.LINE_AA,
        )
        cy += row_height + row_gap


def draw_annotations(
    image: Any,
    result: FrameAnalysisResult,
    zones: list[Zone],
) -> Any:
    import cv2
    import numpy as np

    canvas = image.copy()
    img_h, img_w = canvas.shape[:2]
    font_scale, font_thick = _scale_font(img_w)
    persons = [d for d in result.detections if d.class_name == "person"]
    non_person_detections = [d for d in result.detections if d.class_name != "person"]

    violation_bboxes: set[tuple[float, ...]] = set()
    violation_labels: dict[tuple[float, ...], list[str]] = {}
    for evt in result.events:
        for key in ("detection_bbox", "vehicle_bbox", "forklift_bbox"):
            bbox = evt.metadata.get(key)
            if bbox:
                tup = tuple(bbox)
                violation_bboxes.add(tup)
                violation_labels.setdefault(tup, []).append(evt.event_type)

    for zone in zones:
        if zone.type == "restricted":
            pts = np.array(zone.polygon, dtype=np.int32).reshape(-1, 1, 2)
            cv2.polylines(canvas, [pts], isClosed=True, color=ZONE_COLOR, thickness=2, lineType=cv2.LINE_AA)
            cx = int(np.mean([p[0] for p in zone.polygon]))
            cy = int(min(p[1] for p in zone.polygon)) - 8
            cv2.putText(canvas, zone.name, (cx - 40, max(cy, 14)), cv2.FONT_HERSHEY_SIMPLEX, font_scale, ZONE_COLOR, font_thick, cv2.LINE_AA)

    for det in non_person_detections:
        x1, y1, x2, y2 = [int(v) for v in det.bbox]
        tup = tuple(det.bbox)
        is_violation = tup in violation_bboxes

        if is_violation:
            color = VIOLATION_COLOR
            thickness = 3
        else:
            color = CLASS_COLORS.get(det.class_name, (180, 180, 180))
            thickness = 2

        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, thickness, cv2.LINE_AA)

        label = f"{det.class_name} ({det.confidence:.2f})"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick)
        label_y = max(y1, th + 6)
        cv2.rectangle(canvas, (x1, label_y - th - 6), (x1 + tw + 6, label_y), color, -1)
        cv2.putText(canvas, label, (x1 + 3, label_y - 4), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), font_thick, cv2.LINE_AA)

        if is_violation:
            evt_labels = violation_labels[tup]
            for i, evt_label in enumerate(evt_labels):
                ey = min(y2 + 20 + i * 22, img_h - 4)
                (ew, eh), _ = cv2.getTextSize(evt_label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick + 1)
                cv2.rectangle(canvas, (x1, ey - eh - 4), (x1 + ew + 6, ey + 4), (0, 0, 0), -1)
                cv2.putText(canvas, evt_label, (x1 + 3, ey), cv2.FONT_HERSHEY_SIMPLEX, font_scale, VIOLATION_COLOR, font_thick + 1, cv2.LINE_AA)

    occupied_panels: list[tuple[int, int, int, int]] = []
    for idx, person in enumerate(persons, start=1):
        statuses = _person_status_map(person, result.events)
        _draw_person_status_panel(
            canvas=canvas,
            person=person,
            person_index=idx,
            statuses=statuses,
            font_scale=font_scale,
            font_thick=font_thick,
            occupied_panels=occupied_panels,
        )

    return canvas


def save_output(result: FrameAnalysisResult, path: str) -> None:
    try:
        Path(path).write_text(
            result.model_dump_json(indent=2),
            encoding="utf-8",
        )
        print(f"Result saved to {path}")
    except OSError as exc:
        print(f"Error: could not save output: {exc}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the Luro AI Safety Pipeline from the command line.",
    )
    parser.add_argument(
        "--scenario",
        choices=VALID_SCENARIOS,
        help="Mock detector scenario to run",
    )
    parser.add_argument(
        "--image",
        help="Path to an image file (uses YOLO or mock fallback)",
    )
    parser.add_argument(
        "--zones",
        help="Path to a JSON file containing zone definitions",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Print human-readable formatted output instead of JSON",
    )
    parser.add_argument(
        "--use-yolo",
        action="store_true",
        help="Use YoloDetector for real image inference",
    )
    parser.add_argument(
        "--model-path",
        help="Path to the YOLO .pt model file (required with --use-yolo)",
    )
    parser.add_argument(
        "--conf-threshold",
        type=float,
        default=0.35,
        help="YOLO min confidence (default: 0.35 â€” PPE sÄ±nÄ±flarÄ± iÃ§in 0.40 bazen yelek kaÃ§Ä±rÄ±r)",
    )
    parser.add_argument(
        "--show",
        action="store_true",
        help="Display image with bounding boxes and events drawn",
    )
    parser.add_argument(
        "--save-image",
        dest="save_image",
        help="Path to save annotated image",
    )
    parser.add_argument(
        "--save-output",
        dest="save_output",
        help="Save the full analysis result as JSON to this path",
    )
    parser.add_argument(
        "--fire-smoke-model",
        dest="fire_smoke_model",
        help="Ä°kinci YOLO aÄŸÄ±rlÄ±ÄŸÄ± (fire/smoke sÄ±nÄ±flarÄ±). Sadece --use-yolo ile.",
    )
    parser.add_argument(
        "--fire-smoke-conf",
        dest="fire_smoke_conf",
        type=float,
        default=0.28,
        help="YangÄ±n/duman YOLO min gÃ¼ven (varsayÄ±lan: 0.28)",
    )
    parser.add_argument(
        "--fire-smoke-min-area",
        dest="fire_smoke_min_area",
        type=float,
        default=400.0,
        help="YangÄ±n/duman kutusu min alan pxÂ² (varsayÄ±lan: 400)",
    )

    args = parser.parse_args()

    if args.use_yolo and args.scenario:
        parser.error("--use-yolo and --scenario cannot be used together")
    if args.use_yolo and not args.image:
        parser.error("--use-yolo requires --image")
    if args.use_yolo and not args.model_path:
        parser.error("--use-yolo requires --model-path")
    if args.fire_smoke_model and not args.use_yolo:
        parser.error("--fire-smoke-model requires --use-yolo")
    if (args.show or args.save_image) and not args.image:
        parser.error("--show and --save-image require --image")
    if args.scenario is None and args.image is None:
        parser.error("Provide at least --scenario or --image")

    image = None
    if args.image:
        image = load_image(args.image)

    if args.use_yolo:
        base = YoloDetector(
            model_path=args.model_path,
            confidence_threshold=args.conf_threshold,
        )
        detector = stack_with_fire_smoke(
            base,
            args.fire_smoke_model,
            fire_smoke_conf=args.fire_smoke_conf,
            fire_smoke_min_area=args.fire_smoke_min_area,
        )
        detector_label = "YoloDetector+FireSmoke" if args.fire_smoke_model else "YoloDetector"
    else:
        scenario = args.scenario or "all"
        detector = MockDetector(scenario=scenario)
        detector_label = f"MockDetector({scenario})"

    zones: list[Zone] = []
    if args.zones:
        zones = load_zones(args.zones)

    pipeline = SafetyPipeline(detector=detector)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    result = pipeline.analyze(
        image=image,
        timestamp=timestamp,
        zones=zones if zones else None,
    )

    if args.pretty:
        print_pretty(result, detector_label)
    else:
        print(result.model_dump_json(indent=2))

    if args.save_output:
        save_output(result, args.save_output)

    if (args.show or args.save_image) and image is not None:
        import cv2

        annotated = draw_annotations(image, result, zones)

        if args.save_image:
            cv2.imwrite(args.save_image, annotated)
            print(f"Annotated image saved to {args.save_image}")

        if args.show:
            cv2.imshow("Luro Safety Pipeline", annotated)
            cv2.waitKey(0)
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
