# Changelog

## 0.1.0

- First release: provider-independent file storage behind one `Storage` port.
- Adapters: `s3` (AWS S3, MinIO, Spaces), `local-fs` (dev), `memory` (tests).
- Presigned uploads pinned to the content type, confirmation by real content (magic bytes) with reject-and-delete, public CDN URLs, S3 or CloudFront signed URLs, read/write/batched delete.
- Image variants (thumb 320 px, medium 960 px, WebP, EXIF stripped) via `sharp` behind an `ImageProcessor` port.
- Typed errors with retry/backoff, strict production rules, dev bucket bootstrap, upload fixtures.
