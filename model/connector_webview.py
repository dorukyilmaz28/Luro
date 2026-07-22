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
import sys
import threading
from pathlib import Path

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
  .cam-row { display:flex; gap:8px; margin-bottom:8px; }
  .cam-row .code { width:120px; flex:none; }
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
        <button class="btn btn-ghost" onclick="addCamera()">+ Kamera Ekle</button>
      </div>
      <div id="cameras"></div>
      <p class="hint">Kaynak: webcam için <b>0</b>, IP kamera için <b>rtsp://kullanici:sifre@ip:554/stream</b></p>
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

  function addCamera(code, source) {
    const wrap = document.getElementById('cameras');
    const row = document.createElement('div');
    row.className = 'cam-row';
    row.innerHTML = `
      <input class="code" placeholder="CAM-01" value="${code||''}" />
      <input class="src" placeholder="0  ·  rtsp://..." value="${source||''}" />
      <button class="btn btn-danger" title="Kaldır">✕</button>`;
    row.querySelector('.btn-danger').onclick = () => {
      if (document.querySelectorAll('.cam-row').length > 1) row.remove();
    };
    wrap.appendChild(row);
  }

  function collectConfig() {
    const cameras = [];
    document.querySelectorAll('.cam-row').forEach(r => {
      const code = r.querySelector('.code').value.trim();
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
      (cfg.cameras && cfg.cameras.length ? cfg.cameras : [{code:'CAM-01', source:'0'}])
        .forEach(c => addCamera(c.code, String(c.source)));
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
            "intervalSec": 5,
            "cooldownSec": 60,
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

    def _run_loop(self, config: dict) -> None:
        interval = float(config.get("intervalSec", 5))
        cooldowns: dict = {}
        trackers: dict = {}
        while not self._stop.is_set():
            try:
                engine.run_pass(config, cooldowns, trackers, log=self._log)
            except Exception as exc:  # noqa: BLE001
                self._log(f"! beklenmeyen hata: {exc}")
            self._stop.wait(interval)


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
