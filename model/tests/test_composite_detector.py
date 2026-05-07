from inference.composite_detector import CompositeDetector
from inference.mock_detector import MockDetector
from inference.schemas import Detection


def test_composite_merges_detections():
    a = MockDetector(scenario="no_hardhat")
    b = MockDetector(scenario="fire_smoke")
    c = CompositeDetector(a, b)
    dets = c.detect(None)
    names = {x.class_name for x in dets}
    assert "person" in names
    assert "fire" in names
    assert "smoke" in names


def test_composite_single_sub_detector():
    inner = MockDetector(scenario="proximity")
    c = CompositeDetector(inner)
    assert len(c.detect(None)) == len(inner.detect(None))
