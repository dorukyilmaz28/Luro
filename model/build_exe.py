"""Luro Bağlayıcı'yı tek dosyalık bir Windows .exe olarak paketler.

Kullanım:
    cd model
    python build_exe.py

Çıktı: model/dist/LuroConnector.exe  (müşteriye verilecek tek dosya)
"""

from __future__ import annotations

import subprocess
import os
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
        # ultralytics/torch GEREKMEZ — exe hafif kalır. Arayüz pywebview ile
        # (websitesiyle aynı görünüm) HTML render eder; veri dosyaları toplanır.
        "--collect-all=webview",
        # Luro logosunu exe içine göm (assets/luro-logo.png -> assets/)
        "--add-data=" + str(HERE / "assets" / "luro-logo.png") + os.pathsep + "assets",
        str(HERE / "connector_webview.py"),
    ]
    print("PyInstaller çalışıyor...\n" + " ".join(args))
    subprocess.run(args, cwd=HERE, check=True)
    print("\nBitti. Çıktı: model/dist/LuroConnector.exe")


if __name__ == "__main__":
    main()
