from rules.spatial import (
    bbox_center,
    bbox_intersects_polygon,
    bbox_size,
    distance_between_bboxes,
    head_region,
    iou,
    point_in_polygon,
    segments_intersect,
    torso_region,
)


def test_bbox_center():
    assert bbox_center([0, 0, 100, 200]) == (50.0, 100.0)


def test_bbox_size():
    assert bbox_size([10, 20, 60, 120]) == (50.0, 100.0)


def test_iou_identical():
    box = [0, 0, 100, 100]
    assert iou(box, box) == 1.0


def test_iou_no_overlap():
    assert iou([0, 0, 50, 50], [100, 100, 200, 200]) == 0.0


def test_iou_partial():
    result = iou([0, 0, 100, 100], [50, 50, 150, 150])
    assert 0.1 < result < 0.2


def test_point_in_polygon_inside():
    polygon = [(0, 0), (100, 0), (100, 100), (0, 100)]
    assert point_in_polygon((50, 50), polygon) is True


def test_point_in_polygon_outside():
    polygon = [(0, 0), (100, 0), (100, 100), (0, 100)]
    assert point_in_polygon((150, 50), polygon) is False


def test_distance_between_bboxes():
    dist = distance_between_bboxes([0, 0, 10, 10], [100, 0, 110, 10])
    assert 95 < dist < 105


def test_head_region():
    head = head_region([0, 0, 100, 400], head_ratio=0.30)
    assert head == [0, 0, 100, 120.0]


def test_torso_region():
    torso = torso_region([0, 0, 100, 400], top_ratio=0.30, bottom_ratio=0.70)
    assert torso == [0, 120.0, 100, 280.0]


def test_segments_intersect_overlapping_collinear():
    assert segments_intersect((100, 0), (100, 100), (100, 40), (100, 60)) is True


def test_bbox_intersects_polygon_overlap():
    square = [(0, 0), (100, 0), (100, 100), (0, 100)]
    assert bbox_intersects_polygon([40, 40, 60, 60], square) is True


def test_bbox_intersects_polygon_no_overlap():
    square = [(0, 0), (100, 0), (100, 100), (0, 100)]
    assert bbox_intersects_polygon([200, 200, 300, 300], square) is False


def test_bbox_intersects_polygon_edge_touch():
    """Kutunun bir kenarÄ± poligonla Ã§akÄ±ÅŸÄ±yor; kÃ¶ÅŸe iÃ§erde olmayabilir."""
    square = [(0, 0), (100, 0), (100, 100), (0, 100)]
    assert bbox_intersects_polygon([100, 40, 150, 60], square) is True
