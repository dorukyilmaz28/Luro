# Luro Bağlayıcı (Connector)

Müşterinin sahadaki bir bilgisayarında çalışan köprü uygulaması. Kameralardan
görüntü çeker → Luro yapay zeka servisine gönderir → tespit edilen ihlalleri
Luro paneline iletir. Panele (bulut) ulaşmak için sadece internet bağlantısı
gerekir; kamera trafiği müşterinin yerel ağında kalır.

## Müşteri için (exe ile — teknik bilgi gerekmez)

1. Panelden `LuroConnector.exe`'yi indir, çift tıkla.
2. **Panel → Ayarlar → Luro Bağlayıcı** bölümündeki token'ı kopyalayıp yapıştır.
3. **Kameralarımı Getir**'e bas — panelde tanımlı kameraların listelenir.
4. Her kamera için **Kaynak** yaz: webcam için `0`, IP kamera için
   `rtsp://kullanici:sifre@192.168.1.64:554/stream1`.
5. **👁 İzle** ile kameranın görüntü verdiğini anında doğrula. Video
   uygulamanın içinde canlı oynar; **bu bilgisayardan çıkmaz** — buluta hiçbir
   video akmaz, sadece tespit edilen ihlallerin fotoğrafı panele gider.
6. **Başlat**'a bas. Tespitler panele akmaya başlar.

Ayarlar `C:\Users\<kullanici>\.luro\connector_config.json` içine kaydedilir,
uygulama kapanıp açılınca korunur.

### Kaynak (RTSP) adresi nasıl bulunur

Bağlayıcı **OpenCV'nin açabildiği her kaynağı** kabul eder — marka bağımsız:
webcam indeksi (`0`, `1`), herhangi bir IP kameranın RTSP adresi, HTTP/MJPEG
akışı veya yerel bir video dosyası (test için).

Genel biçim: `rtsp://KULLANICI:SIFRE@IP:554/YOL`

Kalan üç bilgiyi şöyle bulursun:

- **IP**: kameranın uygulamasından (Cihaz Bilgileri) ya da modem arayüzünün
  bağlı cihazlar listesinden.
- **Kullanıcı/şifre**: çoğu marka RTSP için **ayrı bir kamera hesabı** ister;
  bulut/uygulama şifresi çalışmaz. Kameranın ayarlarında "RTSP", "ONVIF" ya da
  "Kamera Hesabı" başlığı altında oluşturulur.
- **Yol**: markaya göre değişir — üreticinin dokümanına bak. Yaygın örnekler:
  `/stream1` (TP-Link Tapo), `/Streaming/Channels/101` (Hikvision),
  `/cam/realmonitor?channel=1&subtype=0` (Dahua), `/h264Preview_01_main` (Reolink).

Doğru yazdığından emin olmak için **👁 İzle**'ye bas — görüntü geliyorsa adres
doğrudur.

> İpuçları: şifrede `@ : / #` gibi karakterler URL'yi bozar (`@` → `%40` diye
> kodlanmalı), en kolayı bunları kullanmamak. Kameraya modemden sabit IP
> (DHCP rezervasyonu) ver, yoksa IP değişince kaynak adresi bozulur.

## Geliştirici için

Çalıştırma:

```bash
cd model
python connector_webview.py     # arayüzlü (websiteyle aynı görünüm, pywebview/HTML)
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
- `connector_webview.py` — masaüstü arayüzü (pywebview + HTML/CSS; websiteyle
  birebir aynı görünüm). Ana uygulama. Yerel canlı izleme de burada:
  `127.0.0.1`'e bağlı, token korumalı minik bir MJPEG sunucusu kareleri
  uygulamanın kendi penceresine akıtır (`preview_camera` → `_PreviewServer`).
- `build_exe.py` — PyInstaller ile tek dosyalık `.exe` üretir.
- `connector_config.example.json` — komut satırı için örnek yapılandırma.
