"""Luro Bağlayıcı — masaüstü arayüz (GUI).

Müşterinin sahadaki bilgisayarında çalışan, kod/terminal gerektirmeyen
pencere uygulaması. Token + kamera bilgilerini girip "Başlat"a basınca
connector motorunu (connector.run_pass) arka planda çalıştırır.

Geliştirme sırasında çalıştırmak için:
    cd model
    python connector_gui.py

Tek dosyalık .exe üretmek için:
    python build_exe.py
"""

from __future__ import annotations

import io
import json
import sys
import threading
import time
from pathlib import Path

import customtkinter as ctk

import connector as engine

# Windowed .exe'de stdout/stderr None olur; print'e düşen bir şey çökmesin.
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

CONFIG_PATH = Path.home() / ".luro" / "connector_config.json"
DEFAULT_SITE_URL = "https://www.luro-ai.com"
DEFAULT_INFER_URL = "http://localhost:8600"

# Marka paleti
ACCENT = "#2f6fb0"
ACCENT_STRONG = "#255a92"
BG = "#f4f7fb"
CARD = "#ffffff"
TEXT = "#1c2733"
MUTED = "#64748a"
BORDER = "#e2e8f0"


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


def normalize_source(value: str):
    value = value.strip()
    return int(value) if value.isdigit() else value


class LuroConnectorApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        ctk.set_appearance_mode("light")
        self.title("Luro Bağlayıcı")
        self.geometry("640x760")
        self.minsize(560, 640)
        self.configure(fg_color=BG)

        self._worker: threading.Thread | None = None
        self._stop = threading.Event()
        self._camera_rows: list[tuple[ctk.CTkEntry, ctk.CTkEntry, ctk.CTkFrame]] = []

        config = load_config()
        self._build_ui(config)

    # ---------- UI ----------
    def _build_ui(self, config: dict) -> None:
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=24, pady=(22, 6))
        ctk.CTkLabel(header, text="Luro Bağlayıcı", font=ctk.CTkFont(size=24, weight="bold"), text_color=TEXT).pack(anchor="w")
        ctk.CTkLabel(
            header,
            text="Kameralarınızı Luro güvenlik paneline bağlar. Token'ınızı girip Başlat'a basın.",
            font=ctk.CTkFont(size=12),
            text_color=MUTED,
            wraplength=560,
            justify="left",
        ).pack(anchor="w", pady=(4, 0))

        # Bağlantı kartı
        card = self._card()
        self._field(card, "İzleme (Ingest) Token'ı")
        self.token_entry = self._entry(card, config.get("ingestToken", ""), show="•")
        ctk.CTkLabel(card, text="Panel → Ayarlar → Luro Bağlayıcı bölümünden alın.", font=ctk.CTkFont(size=11), text_color=MUTED).pack(anchor="w", padx=16, pady=(2, 6))

        self._field(card, "Panel Adresi")
        self.site_entry = self._entry(card, config.get("siteUrl", DEFAULT_SITE_URL))

        self._field(card, "Yapay Zeka Servisi Adresi")
        self.infer_entry = self._entry(card, config.get("inferUrl", DEFAULT_INFER_URL))

        # Kameralar kartı
        cam_card = self._card()
        row = ctk.CTkFrame(cam_card, fg_color="transparent")
        row.pack(fill="x", padx=16, pady=(14, 4))
        ctk.CTkLabel(row, text="Kameralar", font=ctk.CTkFont(size=14, weight="bold"), text_color=TEXT).pack(side="left")
        ctk.CTkButton(
            row, text="+ Kamera Ekle", width=120, height=28, fg_color=CARD, hover_color=BG,
            text_color=ACCENT, border_color=ACCENT, border_width=1, font=ctk.CTkFont(size=12),
            command=lambda: self._add_camera_row("", ""),
        ).pack(side="right")

        self.cam_container = ctk.CTkFrame(cam_card, fg_color="transparent")
        self.cam_container.pack(fill="x", padx=16, pady=(0, 14))
        for cam in config.get("cameras", []):
            self._add_camera_row(cam.get("code", ""), str(cam.get("source", "")))
        ctk.CTkLabel(
            cam_card,
            text="Kaynak: webcam için 0, IP kamera için rtsp://kullanici:sifre@ip:554/stream",
            font=ctk.CTkFont(size=11), text_color=MUTED, wraplength=560, justify="left",
        ).pack(anchor="w", padx=16, pady=(0, 12))

        # Başlat/Durdur + durum
        control = ctk.CTkFrame(self, fg_color="transparent")
        control.pack(fill="x", padx=24, pady=(6, 4))
        self.toggle_btn = ctk.CTkButton(
            control, text="▶  Başlat", height=44, fg_color=ACCENT, hover_color=ACCENT_STRONG,
            font=ctk.CTkFont(size=15, weight="bold"), command=self._toggle,
        )
        self.toggle_btn.pack(side="left", fill="x", expand=True)
        self.status_dot = ctk.CTkLabel(control, text="●", text_color="#94a3b8", font=ctk.CTkFont(size=18))
        self.status_dot.pack(side="left", padx=(12, 4))
        self.status_label = ctk.CTkLabel(control, text="Durduruldu", text_color=MUTED, font=ctk.CTkFont(size=12))
        self.status_label.pack(side="left")

        # Log
        ctk.CTkLabel(self, text="Kayıt", font=ctk.CTkFont(size=12, weight="bold"), text_color=MUTED).pack(anchor="w", padx=26, pady=(10, 2))
        self.log_box = ctk.CTkTextbox(self, height=180, fg_color="#0f172a", text_color="#e2e8f0", font=ctk.CTkFont(family="Consolas", size=11))
        self.log_box.pack(fill="both", expand=True, padx=24, pady=(0, 20))
        self.log_box.configure(state="disabled")

        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _card(self) -> ctk.CTkFrame:
        c = ctk.CTkFrame(self, fg_color=CARD, border_color=BORDER, border_width=1, corner_radius=16)
        c.pack(fill="x", padx=24, pady=(14, 0))
        return c

    def _field(self, parent, label: str) -> None:
        ctk.CTkLabel(parent, text=label.upper(), font=ctk.CTkFont(size=11, weight="bold"), text_color=MUTED).pack(anchor="w", padx=16, pady=(14, 2))

    def _entry(self, parent, value: str = "", show: str | None = None) -> ctk.CTkEntry:
        e = ctk.CTkEntry(parent, height=38, fg_color="#ffffff", border_color=BORDER, text_color=TEXT, show=show or "")
        e.insert(0, value)
        e.pack(fill="x", padx=16)
        return e

    def _add_camera_row(self, code: str, source: str) -> None:
        row = ctk.CTkFrame(self.cam_container, fg_color="transparent")
        row.pack(fill="x", pady=4)
        code_e = ctk.CTkEntry(row, width=110, height=34, placeholder_text="CAM-01", fg_color="#fff", border_color=BORDER, text_color=TEXT)
        code_e.pack(side="left")
        if code:
            code_e.insert(0, code)
        src_e = ctk.CTkEntry(row, height=34, placeholder_text="0  ·  rtsp://...", fg_color="#fff", border_color=BORDER, text_color=TEXT)
        src_e.pack(side="left", fill="x", expand=True, padx=(8, 8))
        if source:
            src_e.insert(0, source)
        remove = ctk.CTkButton(row, text="✕", width=34, height=34, fg_color=CARD, hover_color="#fee2e2", text_color="#e11d48", border_color=BORDER, border_width=1)
        remove.pack(side="left")
        entry_tuple = (code_e, src_e, row)
        remove.configure(command=lambda: self._remove_camera_row(entry_tuple))
        self._camera_rows.append(entry_tuple)

    def _remove_camera_row(self, entry_tuple) -> None:
        if len(self._camera_rows) <= 1:
            return
        code_e, src_e, row = entry_tuple
        row.destroy()
        self._camera_rows.remove(entry_tuple)

    # ---------- Config ----------
    def _collect_config(self) -> dict | None:
        token = self.token_entry.get().strip()
        if not token:
            self.log("! İzleme token'ı gerekli.")
            return None
        cameras = []
        for code_e, src_e, _ in self._camera_rows:
            code = code_e.get().strip()
            source = src_e.get().strip()
            if code and source:
                cameras.append({"code": code, "source": normalize_source(source)})
        if not cameras:
            self.log("! En az bir kamera ekleyin (kod + kaynak).")
            return None
        return {
            "siteUrl": self.site_entry.get().strip() or DEFAULT_SITE_URL,
            "inferUrl": self.infer_entry.get().strip() or DEFAULT_INFER_URL,
            "ingestToken": token,
            "intervalSec": 5,
            "cooldownSec": 60,
            "cameras": cameras,
        }

    # ---------- Kontrol ----------
    def _toggle(self) -> None:
        if self._worker and self._worker.is_alive():
            self._stop_worker()
        else:
            self._start_worker()

    def _start_worker(self) -> None:
        config = self._collect_config()
        if config is None:
            return
        save_config(config)
        self._stop.clear()
        self._worker = threading.Thread(target=self._run_loop, args=(config,), daemon=True)
        self._worker.start()
        self.toggle_btn.configure(text="■  Durdur", fg_color="#e11d48", hover_color="#be123c")
        self.status_dot.configure(text_color="#22c55e")
        self.status_label.configure(text="Çalışıyor")
        self.log("● Bağlayıcı başlatıldı.")

    def _stop_worker(self) -> None:
        self._stop.set()
        self.toggle_btn.configure(text="▶  Başlat", fg_color=ACCENT, hover_color=ACCENT_STRONG)
        self.status_dot.configure(text_color="#94a3b8")
        self.status_label.configure(text="Durduruldu")
        self.log("■ Bağlayıcı durduruldu.")

    def _run_loop(self, config: dict) -> None:
        interval = float(config.get("intervalSec", 5))
        cooldowns: dict = {}
        trackers: dict = {}
        while not self._stop.is_set():
            try:
                engine.run_pass(config, cooldowns, trackers, log=self.log)
            except Exception as exc:  # noqa: BLE001 — arayüz çökmemeli
                self.log(f"! beklenmeyen hata: {exc}")
            self._stop.wait(interval)

    # ---------- Log (thread-safe) ----------
    def log(self, message: str) -> None:
        self.after(0, self._append_log, str(message))

    def _append_log(self, message: str) -> None:
        stamp = time.strftime("%H:%M:%S")
        self.log_box.configure(state="normal")
        self.log_box.insert("end", f"{stamp}  {message}\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def _on_close(self) -> None:
        self._stop.set()
        self.destroy()


def main() -> None:
    app = LuroConnectorApp()
    app.mainloop()


if __name__ == "__main__":
    main()
