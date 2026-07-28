"""Luro Bağlayıcı — masaüstü arayüz (pywebview / HTML).

Websitesiyle birebir aynı görünüm için native pencere içinde gerçek HTML/CSS
render eder (Windows'ta Edge WebView2). connector.run_pass motorunu arka
planda çalıştırır.

Çalıştırma:
    cd model
    python connector_webview.py

.exe üretmek için:
    python build_exe.py
"""

from __future__ import annotations

import base64
import io
import json
import secrets
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import webview

import connector as engine

if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()


def resource_path(rel: str) -> Path:
    """Dev'de betik klasörü, .exe'de PyInstaller geçici klasörü."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / rel


def logo_data_uri() -> str:
    try:
        data = resource_path("assets/luro-logo.png").read_bytes()
        return "data:image/png;base64," + base64.b64encode(data).decode("ascii")
    except OSError:
        return ""


CONFIG_PATH = Path.home() / ".luro" / "connector_config.json"
DEFAULT_SITE_URL = "https://www.luro-ai.com"
DEFAULT_INFER_URL = "https://luro-production.up.railway.app"


def load_config() -> dict:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass
    return {
        "siteUrl": DEFAULT_SITE_URL,
        "inferUrl": DEFAULT_INFER_URL,
        "ingestToken": "",
        "intervalSec": 5,
        "cooldownSec": 60,
        "cameras": [{"code": "CAM-01", "source": "0"}],
    }


def save_config(config: dict) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")


def normalize_source(value):
    value = str(value).strip()
    return int(value) if value.isdigit() else value


# --------------------------------------------------------------------------
# Yerel canlı izleme
#
# Kareler uygulamanın kendi penceresinde MJPEG olarak gösterilir. Kaynak ne
# olursa olsun çalışır: webcam indeksi (0, 1...), herhangi bir markanın RTSP
# adresi, HTTP/MJPEG kamera ya da yerel video dosyası — OpenCV'nin açabildiği
# her şey. Sunucu SADECE 127.0.0.1'e bağlanır, görüntü bilgisayardan çıkmaz.
# --------------------------------------------------------------------------


class _PreviewHandler(BaseHTTPRequestHandler):
    server_version = "LuroPreview/1.0"

    def log_message(self, *args) -> None:  # konsola çöp basma
        pass

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        # Token: makinedeki başka bir program/web sayfası bu portu tarayıp
        # kameraya bakamasın diye. Her açılışta yeniden üretilir.
        if params.get("k", [""])[0] != self.server.access_token:
            self.send_error(403, "forbidden")
            return
        if parsed.path != "/stream":
            self.send_error(404, "not found")
            return
        source = params.get("src", [""])[0]
        if not source:
            self.send_error(400, "src required")
            return
        self._stream(normalize_source(source))

    def _stream(self, source) -> None:
        import cv2

        cap = engine.open_capture(source)
        # Küçük tampon → gerçek zamanlıya en yakın kare (IP kamerada gecikmeyi azaltır).
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:  # noqa: BLE001 — bazı backend'ler desteklemez
            pass
        if not cap.isOpened():
            cap.release()
            self.send_error(503, "camera unavailable")
            return

        # Canlı kaynakta (kamera) read() bir sonraki kareyi bekler, hız kendiliğinden
        # gerçek zamanlıdır. Kayıtlı videoda ise kareler anında gelir; dosyayı da
        # normal hızında oynatmak için FPS'e göre bekliyoruz. Sonlu kare sayısı
        # olması = dosya; canlı akışta bu değer 0/negatiftir.
        frame_delay = 0.0
        try:
            if cap.get(cv2.CAP_PROP_FRAME_COUNT) > 0:
                fps = cap.get(cv2.CAP_PROP_FPS)
                if 0 < fps <= 240:
                    frame_delay = 1.0 / fps
        except Exception:  # noqa: BLE001
            pass

        boundary = "luroframe"
        self.send_response(200)
        self.send_header("Content-Type", f"multipart/x-mixed-replace; boundary={boundary}")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.end_headers()

        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if not ok:
                    continue
                chunk = buf.tobytes()
                self.wfile.write(f"--{boundary}\r\n".encode("ascii"))
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(chunk)}\r\n\r\n".encode("ascii"))
                self.wfile.write(chunk)
                self.wfile.write(b"\r\n")
                if frame_delay:
                    time.sleep(frame_delay)
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass  # kullanıcı izlemeyi kapattı — normal
        finally:
            cap.release()


class _PreviewServer(ThreadingHTTPServer):
    daemon_threads = True
    access_token = ""

    def stream_url(self, source: str) -> str:
        port = self.server_address[1]
        return f"http://127.0.0.1:{port}/stream?k={self.access_token}&src={quote(source, safe='')}"


_preview_server: _PreviewServer | None = None
_preview_server_lock = threading.Lock()


def start_preview_server() -> _PreviewServer:
    """Yerel MJPEG sunucusunu (ilk istekte) başlatır; sonra aynısını döner."""
    global _preview_server
    with _preview_server_lock:
        if _preview_server is None:
            server = _PreviewServer(("127.0.0.1", 0), _PreviewHandler)
            server.access_token = secrets.token_urlsafe(24)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            _preview_server = server
        return _preview_server


HTML = r"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --background:#f7f9fc; --foreground:#1c2733; --surface:#ffffff;
    --accent:#2f6fb0; --accent-strong:#25577f; --danger:#c1554c;
    --muted:#64748a; --border:#e2e8f0; --shadow:0 8px 24px rgba(28,39,51,0.06);
  }
  * { box-sizing:border-box; }
  body {
    margin:0; color:var(--foreground);
    font-family:"Instrument Sans","Segoe UI",system-ui,Arial,sans-serif;
    background-color:var(--background);
    background-image:
      linear-gradient(rgba(28,39,51,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(28,39,51,0.03) 1px, transparent 1px);
    background-size:28px 28px;
  }
  .wrap { max-width:640px; margin:0 auto; padding:28px 24px 40px; }
  .brand { display:flex; align-items:center; gap:11px; }
  .logo { width:36px; height:36px; object-fit:contain; }
  .eyebrow { font-size:11px; font-weight:600; text-transform:uppercase;
    letter-spacing:.2em; color:var(--accent); margin:0; }
  h1 { font-family:Georgia,"Times New Roman",serif; font-weight:500;
    font-size:30px; margin:6px 0 4px; letter-spacing:-.01em; }
  .sub { color:var(--muted); font-size:13px; line-height:1.6; margin:0; max-width:520px; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:16px;
    box-shadow:var(--shadow); padding:20px; margin-top:16px; }
  label { display:block; font-size:11px; font-weight:600; text-transform:uppercase;
    letter-spacing:.06em; color:var(--muted); margin:14px 0 6px; }
  label:first-child { margin-top:0; }
  input {
    width:100%; height:40px; border:1px solid var(--border); border-radius:12px;
    background:#fff; padding:0 14px; font-size:14px; color:var(--foreground); outline:none;
    font-family:inherit; transition:border-color .15s, box-shadow .15s;
  }
  input:focus { border-color:rgba(47,111,176,.5); box-shadow:0 0 0 3px rgba(47,111,176,.10); }
  .hint { font-size:11px; color:var(--muted); margin-top:6px; }
  .row-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .row-head h2 { font-size:15px; font-weight:600; margin:0; }
  .cam-item { margin-bottom:10px; }
  .cam-row { display:flex; gap:8px; align-items:center; }
  .cam-row .code { width:150px; flex:none; }
  .cam-row .src { flex:1; min-width:0; }
  .btn-watch { background:#fff; color:var(--accent); border:1px solid rgba(47,111,176,.3);
    height:40px; padding:0 14px; flex:none; font-size:13px; white-space:nowrap; }
  .btn-watch:hover { background:rgba(47,111,176,.08); }
  .btn-watch.on { background:var(--accent); color:#fff; border-color:var(--accent); }
  .preview { margin-top:8px; border-radius:12px; overflow:hidden; background:#0f172a;
    position:relative; aspect-ratio:16/9; }
  .preview img { width:100%; height:100%; object-fit:contain; display:block; }
  .preview .msg { position:absolute; inset:0; display:flex; align-items:center;
    justify-content:center; color:#94a3b8; font-size:12px; text-align:center; padding:12px; }
  select.code { height:40px; border:1px solid var(--border); border-radius:12px;
    background:#fff; color:var(--foreground); padding:0 10px; font-family:inherit; font-size:13px; outline:none; }
  .btn { border:none; cursor:pointer; font-family:inherit; font-weight:600; border-radius:999px; transition:background .15s, opacity .15s; }
  .btn-primary { background:var(--accent); color:#fff; }
  .btn-primary:hover { background:var(--accent-strong); }
  .btn-ghost { background:#fff; color:var(--accent); border:1px solid rgba(47,111,176,.3); padding:7px 14px; font-size:12px; }
  .btn-ghost:hover { background:rgba(47,111,176,.08); }
  .btn-danger { background:#fff; color:#e11d48; border:1px solid var(--border); width:40px; height:40px; flex:none; font-size:15px; }
  .btn-danger:hover { background:#fee2e2; }
  .controls { display:flex; align-items:center; gap:12px; margin-top:18px; }
  #startBtn { flex:1; height:46px; font-size:15px; }
  .status { display:flex; align-items:center; gap:7px; font-size:13px; color:var(--muted); }
  .dot { width:9px; height:9px; border-radius:50%; background:#94a3b8; }
  .dot.live { background:#22c55e; box-shadow:0 0 0 4px rgba(34,197,94,.15); }
  .log-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin:22px 4px 8px; }
  #log { background:#0f172a; color:#e2e8f0; border-radius:14px; padding:14px 16px;
    font-family:Consolas,"Courier New",monospace; font-size:12px; line-height:1.7;
    height:190px; overflow-y:auto; white-space:pre-wrap; }
  #log .muted { color:#64748b; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <img class="logo" src="__LOGO__" alt="Luro" />
      <p class="eyebrow">Endüstriyel AI Güvenlik</p>
    </div>
    <h1>Luro Bağlayıcı</h1>
    <p class="sub">Kameralarınızı Luro güvenlik paneline bağlar. Token'ınızı girip Başlat'a basın; tespit edilen ihlaller anında panelinize akar.</p>

    <div class="card">
      <label>İzleme (Ingest) Token'ı</label>
      <input id="token" type="password" placeholder="luro_ing_..." />
      <p class="hint">Panel → Ayarlar → Luro Bağlayıcı bölümünden alın.</p>
    </div>

    <div class="card">
      <div class="row-head">
        <h2>Kameralar</h2>
        <button class="btn btn-ghost" onclick="loadCameras()">↻ Kameralarımı Getir</button>
      </div>
      <div id="cameras"></div>
      <p id="camHint" class="hint">Token'ınızı girip <b>Kameralarımı Getir</b>'e basın — panelde tanımlı kameralar buraya gelir. Her kamera için sadece kaynağı (webcam <b>0</b> ya da <b>rtsp://...</b>) yazın. <b>👁 İzle</b> ile kamerayı burada canlı izleyip anında test edebilirsiniz (görüntü bu bilgisayardan çıkmaz).</p>
    </div>

    <div class="controls">
      <button id="startBtn" class="btn btn-primary" onclick="toggle()">▶&nbsp;&nbsp;Başlat</button>
      <div class="status"><span id="dot" class="dot"></span><span id="statusText">Durduruldu</span></div>
    </div>

    <p class="log-title">Kayıt</p>
    <div id="log"><span class="muted">Bağlayıcı henüz başlatılmadı.</span></div>
  </div>

<script>
  let running = false;
  let availableCameras = [];   // panelde tanımlı kameralar
  let savedCameras = [];       // önceki kaynak değerleri (koda göre)

  function addCameraRow(selectedCode, source) {
    const wrap = document.getElementById('cameras');
    const item = document.createElement('div');
    item.className = 'cam-item';
    const options = availableCameras.map(c =>
      `<option value="${c.code}" ${c.code===selectedCode?'selected':''}>${(c.name||c.code)} (${c.code})</option>`
    ).join('');
    item.innerHTML = `
      <div class="cam-row">
        <select class="code">${options}</select>
        <input class="src" placeholder="0  ·  rtsp://..." value="${source||''}" />
        <button class="btn btn-watch" title="Bu bilgisayarda canlı izle">👁 İzle</button>
        <button class="btn btn-danger" title="Kaldır">✕</button>
      </div>`;
    item.querySelector('.btn-danger').onclick = () => item.remove();
    item.querySelector('.btn-watch').onclick = () => toggleWatch(item);
    wrap.appendChild(item);
  }

  function closeWatch(item) {
    const pane = item.querySelector('.preview');
    if (pane) pane.remove();          // <img> gidince akış da kapanır
    const btn = item.querySelector('.btn-watch');
    btn.classList.remove('on');
    btn.innerHTML = '👁 İzle';
  }

  async function toggleWatch(item) {
    const btn = item.querySelector('.btn-watch');
    if (item.querySelector('.preview')) { closeWatch(item); return; }

    const src = item.querySelector('.src').value.trim();
    if (!src) { luroLog('! Önce bu kamera için kaynağı girin (0 veya rtsp://...).'); return; }

    const res = await window.pywebview.api.preview_camera(src);
    if (!res || !res.ok) { luroLog('! ' + ((res && res.error) || 'İzleme açılamadı.')); return; }

    const pane = document.createElement('div');
    pane.className = 'preview';
    pane.innerHTML = `<div class="msg">Bağlanılıyor…</div><img alt="" />`;
    const img = pane.querySelector('img');
    img.onload = () => { const m = pane.querySelector('.msg'); if (m) m.remove(); };
    img.onerror = () => {
      const m = pane.querySelector('.msg');
      if (m) m.textContent = 'Görüntü alınamadı. Kaynağı, kullanıcı adı/şifreyi ve ağ bağlantısını kontrol edin.';
      luroLog('! Görüntü alınamadı: ' + src);
    };
    img.src = res.url;
    item.appendChild(pane);
    btn.classList.add('on');
    btn.innerHTML = '■ Kapat';
    luroLog('▶ Canlı izleme açıldı: ' + src);
  }

  async function loadCameras() {
    const token = document.getElementById('token').value.trim();
    const hint = document.getElementById('camHint');
    if (!token) { hint.textContent = 'Önce token girin.'; return; }
    hint.textContent = 'Kameralar getiriliyor…';
    const res = await window.pywebview.api.list_cameras(token);
    if (!res || !res.ok) { hint.textContent = '! ' + ((res && res.error) || 'Kameralar alınamadı.'); return; }
    availableCameras = res.cameras || [];
    document.getElementById('cameras').innerHTML = '';
    if (availableCameras.length === 0) {
      hint.innerHTML = 'Panelde hiç kamera yok. Önce <b>luro-ai.com → Kameralar</b>\'dan kamera ekleyin.';
      return;
    }
    hint.innerHTML = 'Her kamera için kaynağı yazın: webcam <b>0</b>, IP kamera <b>rtsp://...</b>';
    const srcByCode = {};
    savedCameras.forEach(c => { srcByCode[c.code] = String(c.source); });
    availableCameras.forEach(c => addCameraRow(c.code, srcByCode[c.code] || ''));
  }

  function collectConfig() {
    const cameras = [];
    document.querySelectorAll('.cam-item').forEach(r => {
      const code = (r.querySelector('.code').value || '').trim();
      const source = r.querySelector('.src').value.trim();
      if (code && source) cameras.push({ code, source });
    });
    return {
      ingestToken: document.getElementById('token').value.trim(),
      cameras,
    };
  }

  function setRunning(on) {
    running = on;
    const btn = document.getElementById('startBtn');
    const dot = document.getElementById('dot');
    const st = document.getElementById('statusText');
    if (on) {
      btn.textContent = '■  Durdur';
      btn.style.background = '#e11d48';
      dot.classList.add('live'); st.textContent = 'Çalışıyor';
    } else {
      btn.innerHTML = '▶&nbsp;&nbsp;Başlat';
      btn.style.background = '';
      dot.classList.remove('live'); st.textContent = 'Durduruldu';
    }
  }

  async function toggle() {
    if (running) {
      await window.pywebview.api.stop();
      setRunning(false);
    } else {
      const res = await window.pywebview.api.start(collectConfig());
      if (res && res.ok) setRunning(true);
      else luroLog('! ' + ((res && res.error) || 'Başlatılamadı.'));
    }
  }

  function luroLog(message) {
    const log = document.getElementById('log');
    const first = log.querySelector('.muted');
    if (first) log.innerHTML = '';
    const time = new Date().toLocaleTimeString('tr-TR');
    log.textContent += `${time}  ${message}\n`;
    log.scrollTop = log.scrollHeight;
  }

  function init() {
    window.pywebview.api.get_config().then(cfg => {
      document.getElementById('token').value = cfg.ingestToken || '';
      savedCameras = cfg.cameras || [];
      if (cfg.ingestToken) loadCameras();
    });
  }
  window.addEventListener('pywebviewready', init);
</script>
</body>
</html>"""


class Api:
    def __init__(self) -> None:
        self._window = None
        self._worker: threading.Thread | None = None
        self._stop = threading.Event()

    def set_window(self, window) -> None:
        self._window = window

    def _log(self, message: str) -> None:
        if self._window is None:
            return
        try:
            self._window.evaluate_js(f"luroLog({json.dumps(str(message))})")
        except Exception:
            pass

    def get_config(self) -> dict:
        return load_config()

    def list_cameras(self, token: str) -> dict:
        """Fetch the token holder's registered cameras from the dashboard."""
        import requests

        token = (token or "").strip()
        if not token:
            return {"ok": False, "error": "Önce token girin."}
        try:
            resp = requests.get(
                f"{DEFAULT_SITE_URL}/api/connector/cameras",
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
            if resp.status_code == 401:
                return {"ok": False, "error": "Token geçersiz. Panelden doğru token'ı kopyalayın."}
            resp.raise_for_status()
            return {"ok": True, "cameras": resp.json().get("cameras", [])}
        except requests.RequestException as exc:
            return {"ok": False, "error": f"Kameralar alınamadı: {exc}"}

    def start(self, config: dict) -> dict:
        token = (config.get("ingestToken") or "").strip()
        if not token:
            return {"ok": False, "error": "İzleme token'ı gerekli."}
        cameras = []
        for cam in config.get("cameras", []):
            code = str(cam.get("code", "")).strip()
            source = str(cam.get("source", "")).strip()
            if code and source:
                cameras.append({"code": code, "source": normalize_source(source)})
        if not cameras:
            return {"ok": False, "error": "En az bir kamera ekleyin."}

        # Panel ve AI servisi adresleri sabit (bulutta) — kullanıcı düzenlemez,
        # eski kayıtlı localhost değerleri de yok sayılır.
        full = {
            "siteUrl": DEFAULT_SITE_URL,
            "inferUrl": DEFAULT_INFER_URL,
            "ingestToken": token,
            "cooldownSec": 60,
            "analyzeFps": 2,
            "idleAnalyzeSec": 30,
            "cameras": cameras,
        }
        save_config(full)
        self._stop.clear()
        self._worker = threading.Thread(target=self._run_loop, args=(full,), daemon=True)
        self._worker.start()
        self._log("● Bağlayıcı başlatıldı.")
        return {"ok": True}

    def stop(self) -> dict:
        self._stop.set()
        self._log("■ Bağlayıcı durduruldu.")
        return {"ok": True}

    def preview_camera(self, source: str) -> dict:
        """Kamerayı uygulamanın içinde gerçek zamanlı gösterecek yerel akış adresi döner.

        Görüntü yalnızca bu bilgisayarda kalır — ağdan çıkmaz, buluta gitmez.
        Tespit motorundan bağımsızdır; 'kamera gerçekten görüntü veriyor mu?'
        sorusunu anında cevaplamak içindir."""
        src = str(source).strip()
        if not src:
            return {"ok": False, "error": "Önce bu kamera için kaynağı girin (0 veya rtsp://...)."}
        try:
            server = start_preview_server()
        except OSError as exc:
            return {"ok": False, "error": f"Yerel izleme servisi başlatılamadı: {exc}"}
        return {"ok": True, "url": server.stream_url(src)}

    def _run_loop(self, config: dict) -> None:
        """Sürekli akış motorunu çalıştırır (kamera başına bir iş parçacığı)."""
        try:
            engine.run_stream(config, self._stop, log=self._log)
        except Exception as exc:  # noqa: BLE001
            self._log(f"! beklenmeyen hata: {exc}")


def main() -> None:
    api = Api()
    html = HTML.replace("__LOGO__", logo_data_uri())
    window = webview.create_window(
        "Luro Bağlayıcı",
        html=html,
        js_api=api,
        width=720,
        height=860,
        min_size=(560, 640),
        background_color="#f7f9fc",
    )
    api.set_window(window)
    webview.start()


if __name__ == "__main__":
    main()
