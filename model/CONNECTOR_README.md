# Luro Bağlayıcı (Connector)

Müşterinin sahadaki bir bilgisayarında çalışan köprü uygulaması. Kameralardan
görüntü çeker → Luro yapay zeka servisine gönderir → tespit edilen ihlalleri
Luro paneline iletir. Panele (bulut) ulaşmak için sadece internet bağlantısı
gerekir; kamera trafiği müşterinin yerel ağında kalır.

## Müşteri için (exe ile — teknik bilgi gerekmez)

1. Panelden `LuroConnector.exe`'yi indir, çift tıkla.
2. **Panel → Ayarlar → Luro Bağlayıcı** bölümündeki token'ı kopyalayıp yapıştır.
3. Kameraları ekle:
   - **Kamera Kodu**: panelde tanımladığın kod (örn. `CAM-01`).
   - **Kaynak**: webcam için `0`, IP kamera için
     `rtsp://kullanici:sifre@192.168.1.64:554/stream`.
4. **Başlat**'a bas. Tespitler panele akmaya başlar.

Ayarlar `C:\Users\<kullanici>\.luro\connector_config.json` içine kaydedilir,
uygulama kapanıp açılınca korunur.

## Geliştirici için

Çalıştırma:

```bash
cd model
python connector_gui.py         # arayüzlü
python connector.py --once      # komut satırı, tek geçiş (connector_config.json ile)
```

Exe üretme (tek dosya, Windows):

```bash
cd model
python build_exe.py             # -> model/dist/LuroConnector.exe
```

Bağlayıcı **modeli çalıştırmaz** — kareyi HTTP ile yapay zeka servisine
(`inferUrl`) yollar. Bu yüzden exe hafiftir (~70 MB): torch/ultralytics
içermez, sadece opencv + pillow + requests + arayüz.

## Mimari

```
Kamera (yerel ağ)
   │  RTSP / webcam
   ▼
Luro Bağlayıcı  ──HTTP──▶  Yapay Zeka Servisi (server.py)   [şimdilik lokal, sonra bulut]
   │                            tespitler + kural olayları
   │  POST /api/events (ingest token)
   ▼
Luro Panel / Bulut (Vercel + Neon)  ──▶  Dashboard, uyarılar, rapor, e-posta
```

## Dosyalar

- `connector.py` — motor: kare çekme, çıkarım çağrısı, kişi takibi + tekrar
  önleme (cooldown), yasaklı bölge çekme/ölçekleme, snapshot çizimi, `/api/events`'e gönderim.
- `connector_gui.py` — CustomTkinter masaüstü arayüzü (marka mavisi tema).
- `build_exe.py` — PyInstaller ile tek dosyalık `.exe` üretir.
- `connector_config.example.json` — komut satırı için örnek yapılandırma.
