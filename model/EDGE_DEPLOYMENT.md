# Edge Deployment (NVIDIA Jetson) — Research Notes

Status: research/reference only, no code yet. Written so implementation can start
directly once hardware is in hand and a customer pilot needs real video ingestion.

## Why an edge device at all

Self-service camera onboarding (`app/dashboard/cameras`) lets a customer register a
camera's RTSP address in our dashboard, but the Luro cloud server usually **cannot
reach it**: the overwhelming majority of CCTV/IP cameras sit on a private LAN (NVR
subnet, VLAN, no port forwarding, no public IP), so a plain outbound connection from
our server never reaches the camera. This is why `POST /api/cameras/test-connection`
is scoped honestly as a TCP-reachability probe against whatever host:port the customer
typed, not a real stream check — it can only ever succeed if the camera happens to be
internet-reachable, which is rare and not something we should encourage (opening CCTV
to the public internet is a real security liability for the customer).

The fix used by every vendor in this space (including the "connect your own camera"
competitors, see below) is the same shape: ship a small on-prem box that sits on the
customer's LAN, pulls the RTSP streams locally, runs inference locally, and pushes
only the *results* (event metadata + a small evidence crop, not raw video) up to the
cloud over a normal outbound HTTPS connection. That box is the actual product this
doc is about — referred to here as "Luro Edge."

## Hardware: NVIDIA Jetson Orin family

| Module | Price (dev kit) | AI perf | Realistic camera count (our PPE/hazard models) |
|---|---|---|---|
| Jetson Orin Nano Super (8GB) | ~$249 | 67 TOPS (post Super-mode unlock) | 4–6 streams @ 15fps |
| Jetson Orin NX (16GB) | ~$599 | 100 TOPS | 8–12 streams @ 15fps |
| Jetson AGX Orin (64GB) | ~$1,999 | 275 TOPS | 20+ streams, or a few streams at very high res/fps |

For a first pilot, the **Orin Nano Super** is the right starting SKU: cheap enough to
put in front of a customer without a large capex conversation, and 4–6 camera coverage
matches a typical single-site industrial pilot (a few entry points + a couple of
hazard zones). Orin NX becomes the "site license" tier once a customer wants
whole-facility coverage from one box; AGX Orin is a later multi-site/enterprise SKU,
not needed for launch.

All three run the same software stack (JetPack/L4T, TensorRT, DeepStream), so the
software work described below is written once and just gets a bigger box under it as
customers scale up — no separate porting effort per tier.

## Software stack

- **JetPack** (NVIDIA's Jetson Linux + driver bundle) — OS-level foundation, includes
  CUDA, cuDNN, TensorRT.
- **TensorRT** — converts our trained detection model (currently whatever the
  `model/` training pipeline produces, presumably ONNX-exportable) into an optimized
  engine for the Jetson's GPU. This is the step that gets us real-time multi-stream
  inference instead of CPU-bound frame-by-frame processing.
- **DeepStream SDK** — NVIDIA's video-analytics pipeline framework built on GStreamer.
  Handles RTSP ingestion, decoding (hardware-accelerated H.264/H.265), batching
  multiple camera streams through one TensorRT engine, and drawing/publishing
  detection results. This is what actually gets us from "N RTSP URLs" to "N streams
  of detection events" without hand-rolling a video pipeline.
- **DeepStream's message broker output** (or a simple custom consumer) — used to push
  results off the box. For us this means: on a detection event, POST to our existing
  ingestion endpoint.

## How it plugs into what already exists

The cloud side of this integration is **already built and does not need to change**:
`events` rows (`lib/db/schema.ts`) already have `cameraId`, `eventType`, `severity`,
`confidence`, `imageUrl`, `metadata` — exactly the shape a DeepStream pipeline would
emit per detection. The plan is a thin ingestion route, e.g. `POST /api/events`,
authenticated per-edge-device (a long-lived device token minted when a customer's
Luro Edge box is provisioned — separate from the user JWT session), which:

1. Validates the device token → resolves which `cameras` rows (by `cameras.code`,
   which the customer already sets in the self-service camera form) belong to that
   device/site.
2. Inserts an `events` row per detection, optionally uploading the evidence crop to
   the same image storage the dashboard already reads `imageUrl` from.
3. Everything downstream — `lib/dashboard/overview.ts`, `lib/dashboard/risk.ts`, the
   dashboard pages, alerts, proactive suggestions — already consumes `events` rows and
   needs zero changes to start showing real edge-sourced detections instead of mock
   data.

So the only genuinely new work when this gets built for real is: (a) the device-auth
+ `/api/events` ingestion route, (b) the DeepStream pipeline config + TensorRT engine
export for our model, (c) a lightweight provisioning flow (customer's camera `code`
gets bound to a specific edge device). None of it requires touching the schema or the
dashboard again.

## Not building yet

No code in this pass — there's no hardware in hand to test against, and the honest
`test-connection` TCP check plus "yakında" (coming soon) copy in the camera form is
the correct interim UX rather than faking full connectivity. This doc exists so the
above sequencing (device auth → DeepStream config → ingestion route) can be picked up
directly once a Jetson unit is available for a real pilot.
