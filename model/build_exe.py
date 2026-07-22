"""Luro Bağlayıcı'yı tek dosyalık bir Windows .exe olarak paketler.

Kullanım:
    cd model
    python build_exe.py

Çıktı: model/dist/LuroConnector.exe  (müşteriye verilecek tek dosya)
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> None:
    args = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--name=LuroConnector",
        "--onefile",
        "--windowed",  # konsol penceresi açma
        "--noconfirm",
        "--clean",
        # Bağlayıcı modeli çalıştırmaz (görüntüyü buluta yollar), o yüzden
        # ultralytics/torch GEREKMEZ — exe hafif kalır. Sadece customtkinter
        # kendi tema dosyalarına ihtiyaç duyar.
        "--collect-all=customtkinter",
        str(HERE / "connector_gui.py"),
    ]
    print("PyInstaller çalışıyor...\n" + " ".join(args))
    subprocess.run(args, cwd=HERE, check=True)
    print("\nBitti. Çıktı: model/dist/LuroConnector.exe")


if __name__ == "__main__":
    main()
