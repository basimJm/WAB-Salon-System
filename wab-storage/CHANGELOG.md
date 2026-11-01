# Changelog

## 0.2.0

- Cloudflare R2 provider (`provider: 'r2'`, `r2: { accountId, publicBucket, privateBucket, endpoint?, credentials }`): the S3 adapter on the account endpoint `https://<accountId>.r2.cloudflarestorage.com`, region `auto`, request/response checksums only when required (R2 rejects some algorithms; presigned PUTs carry none). Public and private bucket must differ (R2 public access is per bucket); production accepts `s3` or `r2` over https; CloudFront signing stays S3-only.
- `copy({ fromKey, toKey, visibility })`: same-bucket server-side copy that replaces the target in one step (content type kept, public Cache-Control applied); a missing source rejects with `STORAGE_OBJECT_NOT_FOUND`.
- `stat(key)`: visibility, size, content type and last-modified of a stored object, or `null`.
- `configureBucketCors(options, { allowedOrigins, maxAgeSec })`: one exact-origin rule (`GET`, `HEAD`, `PUT`, header `content-type`) on both buckets.

## 0.1.0

- First release: provider-independent file storage behind one `Storage` port.
- Adapters: `s3` (AWS S3, MinIO, Spaces), `local-fs` (dev), `memory` (tests).
- Presigned uploads pinned to the content type, confirmation by real content (magic bytes) with reject-and-delete, public CDN URLs, S3 or CloudFront signed URLs, read/write/batched delete.
- Image variants (thumb 320 px, medium 960 px, WebP, EXIF stripped) via `sharp` behind an `ImageProcessor` port.
- Typed errors with retry/backoff, strict production rules, dev bucket bootstrap, upload fixtures.
