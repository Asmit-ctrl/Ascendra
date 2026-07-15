# ESP32-S3-CAM Integration

Quick notes for integrating an ESP32-S3-CAM device to capture classroom frames and send to the Ascendra backend.

Recommended flow:
1. ESP32 captures JPEG frames at a configurable interval.
2. Device POSTs images to an authenticated ingestion endpoint: `/api/nlp/ingest-image`.
3. Server validates device API key, stores raw image blob (object storage) and enqueues a job for preprocessing and feature extraction.
4. Preprocessing: resize, convert to grayscale (optional), run face-detection / object detection model (edge or server), extract metadata (bounding boxes, embeddings).
5. Persist extracted metadata and a reference to the stored image in `camera_frames` table. Emit telemetry events to event stream for agent consumption.

Security & privacy:
- Use per-device API keys and HMAC-signed requests.
- Store only minimal PII; prefer anonymous embeddings and counts.
- Provide opt-out for recorded classrooms and notify users.

Endpoints to implement (server-side):
- `POST /api/nlp/ingest-image` – accept multipart/form-data (image + device_id + timestamp + signature)
- `GET /api/nlp/device/:id/status` – device heartbeat
