"""Luro Connector — runs on a computer at the customer's site.

Keeps a live connection to each camera, reads every frame, and sends the frames
that matter to the Luro inference service, forwarding detected violations to the
dashboard (/api/events) with the customer's ingest token.

Which frames "matter" is decided by a motion gate plus a rate cap — see the
"Sürekli akış motoru" section below for why.

Usage:
    cd model
    python connector.py                     # continuous stream (production)
    python connector.py --once              # one frame per camera, then exit (testing)
    python connector.py --config my.json

Config (connector_config.json — see connector_config.example.json):
    siteUrl        Luro dashboard base URL, e.g. https://www.luro-ai.com
    ingestToken    token from Dashboard -> Ayarlar -> Luro Baglayici
    inferUrl       inference service URL, e.g. http://localhost:8600
    cooldownSec    per camera+person+event_type re-report cooldown (default 60)
    analyzeFps     max frames analyzed per second per camera (default 2)
    idleAnalyzeSec analyze at least this often even with no motion (default 30)
    motionThreshold fraction of pixels that must change to count as motion (default 0.002)
    refreshSec     how often to re-read zones / detection on-off (default 60)
    cameras        [{"code": "CAM-01", "source": "rtsp://..." | "video.mp4" | 0}]

    intervalSec    (legacy) only used by --once; the stream is not poll-based.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import threading
import time
from pathlib import Path

# RTSP over UDP drops packets on Wi-Fi cameras (Tapo, Reolink…), which shows up
# as torn/green frames. Force TCP transport. Must be set before cv2 is imported.
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")

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


def open_capture(source: str | int, timeout_ms: int = 8000):
    """Kamerayı açar. Ağ kaynaklarında (RTSP/HTTP) açılma ve okuma için süre
    sınırı koyar — ulaşılamayan bir kamera tüm döngüyü kilitlemesin diye.
    Webcam'de (int kaynak) bu ayarlar geçerli değil, doğrudan açılır."""
    if isinstance(source, int):
        return cv2.VideoCapture(source)
    try:
        return cv2.VideoCapture(
            source,
            cv2.CAP_FFMPEG,
            [
                cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, timeout_ms,
                cv2.CAP_PROP_READ_TIMEOUT_MSEC, timeout_ms,
            ],
        )
    except (AttributeError, cv2.error):
        # Eski OpenCV sürümlerinde bu sabitler yok — süresiz de olsa aç.
        return cv2.VideoCapture(source)


def grab_frame(source: str | int) -> "cv2.typing.MatLike | None":
    cap = open_capture(source)
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


def fetch_camera_flags(site_url: str, token: str) -> dict:
    """Return {code: detectionEnabled} for the token's registered cameras."""
    try:
        response = requests.get(
            f"{site_url.rstrip('/')}/api/connector/cameras",
            headers={"Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT_SEC,
        )
        response.raise_for_status()
        return {c["code"]: bool(c.get("detectionEnabled", True)) for c in response.json().get("cameras", [])}
    except (requests.RequestException, KeyError):
        return {}


def report_online(site_url: str, token: str, camera_code: str) -> None:
    """Kameranın canlı olduğunu panele bildirir (hafif heartbeat, görüntü göndermez).

    Canlı izleme artık sahadaki bilgisayarda yerel yapılıyor; buluta JPEG akıtmıyoruz.
    Bu çağrı yalnızca panelde kameranın 'çevrimiçi' rozetini günceller."""
    try:
        requests.post(
            f"{site_url.rstrip('/')}/api/connector/frame",
            json={"cameraCode": camera_code},
            headers={"Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT_SEC,
        )
    except requests.RequestException:
        pass


def scale_zones(zones: list[dict], width: int, height: int) -> list[dict]:
    """Convert normalized (0..1) zone polygons to pixel coords for the inference frame."""
    scaled = []
    for z in zones:
        polygon = z.get("polygon") or []
        pixel_poly = [[float(x) * width, float(y) * height] for x, y in polygon]
        if len(pixel_poly) >= 3:
            scaled.append({**z, "polygon": pixel_poly})
    return scaled


def infer_frame(infer_url: str, frame, zones: list[dict] | None = None, log=print) -> dict | None:
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
        log(f"  ! yapay zeka servisine ulaşılamadı: {exc}")
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


def post_events(
    site_url: str,
    token: str,
    camera_code: str,
    events: list[dict],
    snapshot_base64: str | None = None,
    log=print,
) -> None:
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
        log(f"  -> panele {result.get('inserted', 0)} olay gönderildi ({camera_code})")
    except requests.RequestException as exc:
        log(f"  ! olay gönderilemedi: {exc}")


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
    log=print,
) -> None:
    cooldown_sec = float(config.get("cooldownSec", DEFAULT_COOLDOWN_SEC))
    now = time.monotonic()

    # Per-camera detection on/off, controlled from the dashboard.
    flags = fetch_camera_flags(config["siteUrl"], config["ingestToken"])

    for camera in config["cameras"]:
        code = camera["code"]
        source = camera["source"]
        log(f"[{code}] görüntü alınıyor: {source}")

        frame = grab_frame(source)
        if frame is None:
            log(f"  ! {source} kaynağından görüntü alınamadı")
            continue

        # Kamera görüntü verdi → panelde 'çevrimiçi' rozetini güncelle (heartbeat).
        report_online(config["siteUrl"], config["ingestToken"], code)

        if not flags.get(code, True):
            log("  tespit kapalı (panelden) — atlanıyor")
            continue

        height, width = frame.shape[:2]
        raw_zones = fetch_zones(config["siteUrl"], config["ingestToken"], code)
        zones = scale_zones(raw_zones, width, height)
        if zones:
            log(f"  {len(zones)} yasaklı bölge aktif")

        result = infer_frame(config["inferUrl"], frame, zones=zones, log=log)
        if result is None:
            continue

        detections = result.get("detections", [])
        detected = result.get("events", [])
        log(f"  {len(detections)} tespit, {len(detected)} kural olayı")

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
            post_events(config["siteUrl"], config["ingestToken"], code, fresh, snapshot, log=log)
        elif detected:
            log("  (olaylar bekleme süresinde, gönderilmedi)")


# ---------------------------------------------------------------------------
# Sürekli akış motoru
#
# Eskiden her 5 saniyede bir kamera açılıp TEK kare alınıyordu; RTSP el sıkışması
# da saydığında görüntünün ~%1'i inceleniyordu ve 3-4 saniyelik ihlaller tamamen
# kaçıyordu. Artık bağlantı sürekli açık, her kare okunuyor.
#
# Her kareyi yapay zekâya yollamak ne gerekli ne de ödenebilir (CPU'da çıkarım
# ~0,3 sn). İki kademeli süzgeç var:
#   1) Hareket kapısı — kareler yerelde karşılaştırılır, sahne durgunsa çıkarım
#      yapılmaz. Boş bir depo gece boyunca hiç maliyet çıkarmaz.
#   2) Hız tavanı — hareket sürekli olsa bile saniyede en fazla `analyzeFps`
#      kare incelenir.
# Hareket olmasa da `idleAnalyzeSec` başına bir kare incelenir: kıpırdamadan
# duran bir kişi ya da yavaş yayılan duman böyle yakalanır.
# ---------------------------------------------------------------------------

DEFAULT_ANALYZE_FPS = 2.0
DEFAULT_IDLE_ANALYZE_SEC = 30.0
DEFAULT_MOTION_THRESHOLD = 0.002  # değişen piksel oranı (%0,2)
DEFAULT_REFRESH_SEC = 60.0        # bölge/tespit-durumu tazeleme aralığı
HEARTBEAT_SEC = 30.0
SUMMARY_SEC = 60.0
RECONNECT_MIN_SEC = 2.0
RECONNECT_MAX_SEC = 30.0


class MotionGate:
    """Ardışık kareleri karşılaştırıp sahnede hareket olup olmadığını söyler.

    Küçültülmüş gri görüntüde fark alır — çıkarımın yanında maliyeti ihmal
    edilebilir (~1 ms), ama boş sahnelerde çıkarımın tamamını eler."""

    def __init__(self, threshold: float = DEFAULT_MOTION_THRESHOLD, width: int = 320) -> None:
        self._threshold = threshold
        self._width = width
        self._prev = None

    def _prepare(self, frame):
        h, w = frame.shape[:2]
        if w > self._width:
            frame = cv2.resize(frame, (self._width, max(1, int(h * self._width / w))))
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Hafif bulanıklaştırma: sensör gürültüsü hareket sanılmasın.
        return cv2.GaussianBlur(gray, (5, 5), 0)

    def check(self, frame) -> bool:
        """Bu karede hareket var mı? İlk karede daima True (referans yok)."""
        current = self._prepare(frame)
        previous, self._prev = self._prev, current
        if previous is None:
            return True
        diff = cv2.absdiff(previous, current)
        changed = cv2.countNonZero(cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)[1])
        return (changed / diff.size) >= self._threshold


class FrameAnalyzer:
    """Çıkarımı okuma döngüsünden ayırır.

    Çıkarım ağ üzerinden yapılıyor ve yüklü anlarda saniyeler sürebiliyor. Bunu
    okuma döngüsünün içinde beklersek o süre boyunca kare okunmaz, kamera tamponu
    dolar ve canlı görüntünün gerisinde kalırız — yani geç ve eski kareleri
    incelemeye başlarız.

    Bu yüzden çıkarım kendi iş parçacığında çalışır ve önünde tek kişilik bir sıra
    vardır: meşgulken gelen kare *düşürülür*. Böylece sistem arka uç ne kadar
    kaldırıyorsa o hızda çalışır, hep en güncel kareye bakar ve hiçbir zaman
    birikmiş bir kuyruğun peşinden sürüklenmez. Düşen kare sayısı kayda yazılır —
    sürekli düşüyorsa çıkarım kapasitesi yetmiyor demektir."""

    def __init__(self, config: dict, code: str, log=print) -> None:
        self._config = config
        self._code = code
        self._log = log
        self._tracker = PersonTracker()
        self._cooldowns: dict[tuple, float] = {}
        self._cooldown_sec = float(config.get("cooldownSec", DEFAULT_COOLDOWN_SEC))
        self._slot: tuple | None = None
        self._lock = threading.Lock()
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self.analyzed = 0
        self.dropped = 0
        self.events = 0

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        self._thread.join(timeout=10)

    def submit(self, frame, zones: list[dict]) -> bool:
        """Kareyi incelemeye verir. Çıkarım meşgulse kare düşürülür (False döner)."""
        with self._lock:
            busy = self._slot is not None
            if busy:
                self.dropped += 1
            else:
                self._slot = (frame, zones)
        if not busy:
            self._wake.set()
        return not busy

    def _loop(self) -> None:
        while not self._stop.is_set():
            self._wake.wait()
            self._wake.clear()
            with self._lock:
                job, self._slot = self._slot, None
            if job is None or self._stop.is_set():
                continue
            frame, zones = job
            try:
                height, width = frame.shape[:2]
                self.events += _analyze_frame(
                    self._config, self._code, frame, scale_zones(zones, width, height),
                    self._tracker, self._cooldowns, self._cooldown_sec, self._log,
                )
                self.analyzed += 1
            except Exception as exc:  # noqa: BLE001
                self._log(f"[{self._code}] çıkarım hatası: {exc}")


def _analyze_frame(config, code, frame, zones, tracker, cooldowns, cooldown_sec, log) -> int:
    """Tek kareyi çıkarımdan geçirip yeni olayları panele gönderir. Olay sayısını döner."""
    result = infer_frame(config["inferUrl"], frame, zones=zones, log=log)
    if result is None:
        return 0

    detections = result.get("detections", [])
    detected = result.get("events", [])
    if not detected:
        return 0

    person_bboxes = [d["bbox"] for d in detections if d.get("class_name") == "person"]
    track_ids = tracker.update(person_bboxes)

    now = time.monotonic()
    fresh: list[dict] = []
    for event in detected:
        tid = track_id_for_event(event, person_bboxes, track_ids)
        key = (code, tid, event["event_type"])
        last = cooldowns.get(key)
        if last is not None and (now - last) < cooldown_sec:
            continue
        cooldowns[key] = now
        fresh.append(event)

    if not fresh:
        return 0
    snapshot = encode_snapshot(draw_detections(frame, detections, zones))
    post_events(config["siteUrl"], config["ingestToken"], code, fresh, snapshot, log=log)
    return len(fresh)


def run_camera_stream(config: dict, camera: dict, stop_event, log=print) -> None:
    """Tek kameranın sürekli akışını işler. stop_event kurulana kadar döner."""
    code = camera["code"]
    source = camera["source"]
    site_url, token = config["siteUrl"], config["ingestToken"]

    analyze_fps = float(config.get("analyzeFps", DEFAULT_ANALYZE_FPS))
    min_gap = 1.0 / analyze_fps if analyze_fps > 0 else 0.0
    idle_gap = float(config.get("idleAnalyzeSec", DEFAULT_IDLE_ANALYZE_SEC))
    refresh_gap = float(config.get("refreshSec", DEFAULT_REFRESH_SEC))

    gate = MotionGate(float(config.get("motionThreshold", DEFAULT_MOTION_THRESHOLD)))
    analyzer = FrameAnalyzer(config, code, log=log)
    analyzer.start()

    cap = None
    backoff = RECONNECT_MIN_SEC
    zones: list[dict] = []
    detection_on = True
    last_refresh = last_analyze = last_heartbeat = last_summary = 0.0
    read_count = 0

    try:
        while not stop_event.is_set():
            now = time.monotonic()

            # Panelden gelen ayarlar (tespit açık mı, bölgeler) — periyodik tazelenir.
            if now - last_refresh >= refresh_gap:
                last_refresh = now
                flags = fetch_camera_flags(site_url, token)
                detection_on = flags.get(code, True)
                if detection_on:
                    zones = fetch_zones(site_url, token, code)

            # Tespit kapalıysa kamerayı da bırak — müşterinin CPU'sunu boşuna yakma.
            if not detection_on:
                if cap is not None:
                    cap.release()
                    cap = None
                    log(f"[{code}] tespit kapalı (panelden) — duraklatıldı")
                stop_event.wait(min(refresh_gap, 15.0))
                continue

            if cap is None:
                cap = open_capture(source)
                if not cap.isOpened():
                    cap.release()
                    cap = None
                    log(f"[{code}] bağlanılamadı ({source}) — {backoff:.0f} sn sonra yeniden denenecek")
                    stop_event.wait(backoff)
                    backoff = min(backoff * 2, RECONNECT_MAX_SEC)
                    continue
                log(f"[{code}] bağlandı: {source}")
                backoff = RECONNECT_MIN_SEC
                gate = MotionGate(float(config.get("motionThreshold", DEFAULT_MOTION_THRESHOLD)))

            ok, frame = cap.read()
            if not ok:
                cap.release()
                cap = None
                log(f"[{code}] görüntü akışı kesildi — yeniden bağlanılıyor")
                stop_event.wait(backoff)
                backoff = min(backoff * 2, RECONNECT_MAX_SEC)
                continue
            read_count += 1

            if now - last_heartbeat >= HEARTBEAT_SEC:
                last_heartbeat = now
                report_online(site_url, token, code)

            # İki kademeli süzgeç: önce hız tavanı, sonra hareket (ya da boşta tazeleme).
            # Gönderim bloklamaz — çıkarım meşgulse kare düşer, okumaya devam ederiz.
            if now - last_analyze >= min_gap:
                idle_due = (now - last_analyze) >= idle_gap
                if gate.check(frame) or idle_due:
                    last_analyze = now
                    analyzer.submit(frame, zones)

            if now - last_summary >= SUMMARY_SEC:
                if last_summary:
                    line = (
                        f"[{code}] {read_count} kare okundu, {analyzer.analyzed} incelendi, "
                        f"{analyzer.events} olay (son {SUMMARY_SEC:.0f} sn)"
                    )
                    if analyzer.dropped:
                        line += f" — {analyzer.dropped} kare çıkarım yetişemediği için atlandı"
                    log(line)
                last_summary = now
                read_count = 0
                analyzer.analyzed = analyzer.dropped = analyzer.events = 0
    finally:
        analyzer.stop()
        if cap is not None:
            cap.release()


def run_stream(config: dict, stop_event, log=print) -> None:
    """Tüm kameraları paralel, sürekli akışta işler. stop_event kurulana kadar bloklar."""
    threads = [
        threading.Thread(target=_guarded_stream, args=(config, cam, stop_event, log), daemon=True)
        for cam in config["cameras"]
    ]
    for t in threads:
        t.start()
    while any(t.is_alive() for t in threads) and not stop_event.is_set():
        stop_event.wait(0.5)
    for t in threads:
        t.join(timeout=5)


def _guarded_stream(config: dict, camera: dict, stop_event, log) -> None:
    """Bir kameranın çökmesi diğerlerini durdurmasın."""
    try:
        run_camera_stream(config, camera, stop_event, log=log)
    except Exception as exc:  # noqa: BLE001
        log(f"[{camera.get('code')}] beklenmeyen hata: {exc}")


def main() -> None:
    # Line-buffer stdout so logs are visible when piped/backgrounded.
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser(description="Luro Connector")
    parser.add_argument("--config", default="connector_config.json", help="Path to config JSON")
    parser.add_argument("--once", action="store_true", help="Run a single pass and exit")
    args = parser.parse_args()

    config = load_config(args.config)

    if args.once:
        # Tek geçiş: her kameradan bir kare. Kurulum/bağlantı doğrulaması için.
        run_pass(config, {}, {})
        return

    stop_event = threading.Event()
    print(
        f"Luro Connector started — {len(config['cameras'])} camera(s), "
        f"continuous stream, up to {config.get('analyzeFps', DEFAULT_ANALYZE_FPS)} analyses/sec per camera"
    )
    try:
        run_stream(config, stop_event)
    except KeyboardInterrupt:
        stop_event.set()
        print("\nDurduruluyor…")


if __name__ == "__main__":
    main()
