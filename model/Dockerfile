# Luro çıkarım servisi — CPU'da çalışan FastAPI + YOLO.
# Build context = model/  (Railway'de "root directory" = model olarak ayarla).
FROM python:3.11-slim

# OpenCV'nin ihtiyaç duyduğu sistem kütüphaneleri
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Önce CPU-only torch (CUDA'lı dev paketi indirmesin — imaj küçük kalsın)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodu (model ağırlıkları başlangıçta LURO_MODEL_URL'den inilir)
COPY inference ./inference
COPY rules ./rules
COPY server.py ./

ENV LURO_INFER_PORT=8600
EXPOSE 8600
CMD ["python", "server.py"]
