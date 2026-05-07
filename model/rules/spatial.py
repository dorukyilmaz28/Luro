from __future__ import annotations

import math


def bbox_center(bbox: list[float]) -> tuple[float, float]:
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, (y1 + y2) / 2)


def bbox_bottom_center(bbox: list[float]) -> tuple[float, float]:
    """Midpoint of the bottom edge â€” better for floor zones than full bbox center."""
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, y2)


def bbox_size(bbox: list[float]) -> tuple[float, float]:
    x1, y1, x2, y2 = bbox
    return (abs(x2 - x1), abs(y2 - y1))


def iou(box_a: list[float], box_b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union_area = area_a + area_b - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


def point_in_polygon(
    point: tuple[float, float],
    polygon: list[tuple[float, float]],
) -> bool:
    """Ray-casting algorithm for point-in-polygon test."""
    x, y = point
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def point_in_bbox(px: float, py: float, bbox: list[float]) -> bool:
    x1, y1, x2, y2 = bbox
    xa, xb = (x1, x2) if x1 <= x2 else (x2, x1)
    ya, yb = (y1, y2) if y1 <= y2 else (y2, y1)
    return xa <= px <= xb and ya <= py <= yb


def _normalize_bbox_xyxy(bbox: list[float]) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = bbox
    return (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))


_EPS = 1e-9


def _orient(p: tuple[float, float], q: tuple[float, float], r: tuple[float, float]) -> int:
    v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    if abs(v) < _EPS:
        return 0
    return 1 if v > 0 else 2


def _on_segment(
    p: tuple[float, float],
    q: tuple[float, float],
    r: tuple[float, float],
) -> bool:
    return (
        min(p[0], r[0]) - _EPS <= q[0] <= max(p[0], r[0]) + _EPS
        and min(p[1], r[1]) - _EPS <= q[1] <= max(p[1], r[1]) + _EPS
    )


def segments_intersect(
    p1: tuple[float, float],
    q1: tuple[float, float],
    p2: tuple[float, float],
    q2: tuple[float, float],
) -> bool:
    """True if closed segments p1â€“q1 and p2â€“q2 share any point."""
    o1 = _orient(p1, q1, p2)
    o2 = _orient(p1, q1, q2)
    o3 = _orient(p2, q2, p1)
    o4 = _orient(p2, q2, q1)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and _on_segment(p1, p2, q1):
        return True
    if o2 == 0 and _on_segment(p1, q2, q1):
        return True
    if o3 == 0 and _on_segment(p2, p1, q2):
        return True
    if o4 == 0 and _on_segment(p2, q1, q2):
        return True
    return False


def bbox_intersects_polygon(
    bbox: list[float],
    polygon: list[tuple[float, float]],
) -> bool:
    """True if axis-aligned bbox shares any area with the (simple) polygon."""
    if len(polygon) < 3:
        return False
    x1, y1, x2, y2 = _normalize_bbox_xyxy(bbox)
    corners = ((x1, y1), (x2, y1), (x2, y2), (x1, y2))
    for c in corners:
        if point_in_polygon(c, polygon):
            return True
    for vx, vy in polygon:
        if point_in_bbox(vx, vy, [x1, y1, x2, y2]):
            return True
    box_edges = (
        (corners[0], corners[1]),
        (corners[1], corners[2]),
        (corners[2], corners[3]),
        (corners[3], corners[0]),
    )
    n = len(polygon)
    for i in range(n):
        pe = (polygon[i], polygon[(i + 1) % n])
        for be in box_edges:
            if segments_intersect(be[0], be[1], pe[0], pe[1]):
                return True
    return False


def center_inside(bbox_a: list[float], bbox_b: list[float]) -> bool:
    """Check if the center of bbox_a falls inside bbox_b."""
    cx, cy = bbox_center(bbox_a)
    return point_in_bbox(cx, cy, bbox_b)


def distance_between_bboxes(bbox_a: list[float], bbox_b: list[float]) -> float:
    cx_a, cy_a = bbox_center(bbox_a)
    cx_b, cy_b = bbox_center(bbox_b)
    return math.hypot(cx_a - cx_b, cy_a - cy_b)


def head_region(person_bbox: list[float], head_ratio: float = 0.30) -> list[float]:
    """Upper portion of the person bounding box."""
    x1, y1, x2, y2 = person_bbox
    h = y2 - y1
    return [x1, y1, x2, y1 + h * head_ratio]


def torso_region(
    person_bbox: list[float],
    top_ratio: float = 0.30,
    bottom_ratio: float = 0.70,
) -> list[float]:
    """Middle portion of the person bounding box."""
    x1, y1, x2, y2 = person_bbox
    h = y2 - y1
    return [x1, y1 + h * top_ratio, x2, y1 + h * bottom_ratio]
