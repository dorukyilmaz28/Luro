from inference.schemas import Detection
from rules.config import RuleConfig
from rules.rule_engine import RuleEngine
from rules.zones import Zone

TS = "2026-04-18T12:00:00Z"


def _engine(config: RuleConfig | None = None) -> RuleEngine:
    return RuleEngine(config)


# â”€â”€ Positive tests (event SHOULD be generated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def test_no_hardhat_positive():
    detections = [Detection(class_name="person", confidence=0.95, bbox=[100, 100, 250, 450])]
    events = _engine().generate_events(detections, [], TS)
    types = [e.event_type for e in events]
    assert "no_hardhat" in types


def test_no_vest_positive():
    detections = [
        Detection(class_name="person", confidence=0.92, bbox=[400, 120, 550, 480]),
        Detection(class_name="hardhat", confidence=0.88, bbox=[420, 100, 530, 160]),
    ]
    events = _engine().generate_events(detections, [], TS)
    types = [e.event_type for e in events]
    assert "no_vest" in types


def test_restricted_zone_positive():
    detections = [
        Detection(class_name="person", confidence=0.93, bbox=[180, 200, 280, 480]),
    ]
    zones = [
        Zone(
            zone_id="z1",
            name="Test Zone",
            type="restricted",
            polygon=[(100, 100), (400, 100), (400, 500), (100, 500)],
        )
    ]
    events = _engine().generate_events(detections, zones, TS)
    types = [e.event_type for e in events]
    assert "restricted_zone_entry" in types


def test_unsafe_proximity_positive():
    detections = [
        Detection(class_name="person", confidence=0.94, bbox=[300, 200, 400, 500]),
        Detection(class_name="hardhat", confidence=0.85, bbox=[310, 180, 390, 230]),
        Detection(class_name="safety_vest", confidence=0.90, bbox=[305, 290, 395, 420]),
        Detection(class_name="forklift", confidence=0.97, bbox=[350, 180, 580, 520]),
    ]
    events = _engine().generate_events(detections, [], TS)
    types = [e.event_type for e in events]
    assert "unsafe_proximity" in types


# â”€â”€ Negative tests (NO event should be generated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def test_no_hardhat_negative_with_hardhat():
    detections = [
        Detection(class_name="person", confidence=0.95, bbox=[100, 100, 250, 450]),
        Detection(class_name="hardhat", confidence=0.90, bbox=[110, 90, 240, 150]),
    ]
    events = _engine().generate_events(detections, [], TS)
    types = [e.event_type for e in events]
    assert "no_hardhat" not in types


def test_no_vest_negative_with_vest():
    detections = [
        Detection(class_name="person", confidence=0.92, bbox=[100, 100, 250, 450]),
        Detection(class_name="hardhat", confidence=0.88, bbox=[110, 90, 240, 150]),
        Detection(class_name="safety_vest", confidence=0.89, bbox=[105, 205, 245, 345]),
    ]
    events = _engine().generate_events(detections, [], TS)
    types = [e.event_type for e in events]
    assert "no_vest" not in types


def test_fire_smoke_positive():
    detections = [
        Detection(class_name="smoke", confidence=0.55, bbox=[10, 10, 100, 100]),
    ]
    events = _engine().generate_events(detections, [], TS)
    types = [e.event_type for e in events]
    assert "fire_smoke" in types


def test_fire_smoke_negative_low_confidence():
    from rules.config import RuleConfig

    detections = [
        Detection(class_name="fire", confidence=0.10, bbox=[10, 10, 100, 100]),
    ]
    cfg = RuleConfig(fire_smoke_min_confidence=0.28)
    events = _engine(cfg).generate_events(detections, [], TS)
    assert not any(e.event_type == "fire_smoke" for e in events)


def test_restricted_zone_intersect_any_overlap():
    """Kutu merkezi dÄ±ÅŸarÄ±da olsa bile bbox bÃ¶lgeyle kesiÅŸiyorsa ihlal."""
    from rules.config import RuleConfig

    detections = [
        Detection(class_name="person", confidence=0.9, bbox=[130, 130, 200, 200]),
    ]
    zones = [
        Zone(
            zone_id="z1",
            name="Small",
            type="restricted",
            polygon=[(0, 0), (150, 0), (150, 150), (0, 150)],
        )
    ]
    # Merkez ~(165, 165) poligon dÄ±ÅŸÄ±nda; kÃ¶ÅŸe (130,130) iÃ§erde
    cfg = RuleConfig(restricted_zone_mode="intersect")
    events = _engine(cfg).generate_events(detections, zones, TS)
    assert "restricted_zone_entry" in [e.event_type for e in events]


def test_restricted_zone_negative_outside():
    detections = [
        Detection(class_name="person", confidence=0.93, bbox=[600, 600, 700, 800]),
    ]
    zones = [
        Zone(
            zone_id="z1",
            name="Test Zone",
            type="restricted",
            polygon=[(100, 100), (400, 100), (400, 500), (100, 500)],
        )
    ]
    events = _engine().generate_events(detections, zones, TS)
    types = [e.event_type for e in events]
    assert "restricted_zone_entry" not in types


def test_unsafe_proximity_negative_safe_distance():
    detections = [
        Detection(class_name="person", confidence=0.94, bbox=[100, 200, 200, 500]),
        Detection(class_name="hardhat", confidence=0.85, bbox=[110, 180, 190, 230]),
        Detection(class_name="safety_vest", confidence=0.90, bbox=[105, 290, 195, 420]),
        Detection(class_name="forklift", confidence=0.97, bbox=[800, 200, 1000, 500]),
    ]
    events = _engine().generate_events(detections, [], TS)
    types = [e.event_type for e in events]
    assert "unsafe_proximity" not in types


def test_no_events_for_fully_equipped_worker_outside_zones():
    detections = [
        Detection(class_name="person", confidence=0.95, bbox=[100, 100, 250, 450]),
        Detection(class_name="hardhat", confidence=0.90, bbox=[110, 90, 240, 150]),
        Detection(class_name="safety_vest", confidence=0.89, bbox=[105, 205, 245, 345]),
    ]
    events = _engine().generate_events(detections, [], TS)
    assert len(events) == 0


def test_timestamp_propagated():
    detections = [Detection(class_name="person", confidence=0.95, bbox=[100, 100, 250, 450])]
    custom_ts = "2026-01-01T00:00:00Z"
    events = _engine().generate_events(detections, [], custom_ts)
    assert len(events) > 0
    assert all(e.timestamp == custom_ts for e in events)
