# wab-storage — Task Backlog

> One task = one branch = one PR into `server`. Next task: `python3 scripts/tasks.py next storage`. Rules: `.claude/Rules.md`; target architecture and API: `.claude/Integration.md`; requirements: `docs/WAB_Package_Storage_BRD.md`. Server counterpart: `WAB-Server/src/providers/storage` (fake today; the real S3 provider in the server is replaced by this package in `SRV-112`). Statuses: `TODO` · `IN PROGRESS` · `IN REVIEW` · `DONE` · `PENDING` (owner) · `BLOCKED`.

| ID | Task | Branch | Needs | Status | Sources / notes |
|---|---|---|---|---|---|
| STO-001 | Project scaffold (copy the `wab-notifications` setup): TS strict, eslint, prettier, jest, tsup, `verify`, loop-test config | `feat/sto-001-scaffold` | — | DONE | Rules §4.12 |
| STO-002 | Shared kernel: errors, zod options (`environment`, `provider`, bucket, region, CDN base, limits), prod rules (https, real adapter, credentials), redacting logger, constants (visibilities, variant sizes, rejection reasons) | `feat/sto-002-kernel` | STO-001 | DONE | Rules §2, §3 |
| STO-003 | `StorageProvider` port (`createUploadUrl`, `confirmUpload`, `getPublicUrl`, `getSignedUrl`, `read`, `write`, `delete`, `deleteMany`) + memory adapter | `feat/sto-003-port-memory` | STO-002 | DONE | Integration.md §3 |
| STO-004 | Local-filesystem adapter for dev on localhost (PUT endpoint helper + static serving helper) so apps can upload without AWS | `feat/sto-004-local-fs` | STO-003 | DONE | Rules §2.6 |
| STO-005 | S3 adapter: presigned PUT (content-type + size conditions, server-generated keys), `confirmUpload` (HEAD, real type by magic bytes, size, empty → `REJECTED` + delete), read/write/delete/bulk delete; every AWS error mapped | `feat/sto-005-s3` | STO-003 | DONE | BRD presign/confirm flow; MinIO in `docker-compose` for local tests |
| STO-006 | Public CDN URL builder + short-lived signed GET URLs for private objects (license documents, exports) | `feat/sto-006-urls` | STO-005 | DONE | CloudFront signed URL or S3 presigned GET chosen by options |
| STO-007 | Image variants: thumb 320 px, medium 960 px, WebP, EXIF stripped, via sharp; variant keys derived from the original key | `feat/sto-007-variants` | STO-005 | DONE | Matches `WAB-Server` `domain/uploads/variants.ts` (SRV-047) so the server can delegate |
| STO-008 | MinIO dev mode (path-style endpoint, bucket bootstrap) + rejection fixtures (type mismatch, too large, missing) | `feat/sto-008-minio` | STO-005 | DONE | Rules §2.6 |
| STO-009 | Unit tests per file + coverage gate, loop test (upload → confirm → variants → delete, ≥ 50 iterations), package smoke, README, `Integration.md` | `feat/sto-009-quality` | STO-006, STO-007, STO-008 | DONE | Rules §4.11–14 |
| STO-010 | Publish `@wab/storage`; `WAB-Server` switches `STORAGE_PROVIDER=real` to the package | `feat/sto-010-publish` | STO-009 | PENDING | Owner runs the publish; unblocks SRV-112. AWS bucket/CDN values are env only |
| STO-011 | Cloudflare R2 provider on the S3 adapter (endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`, checksums only when required, public + private bucket, prod https) + `copy` (same-bucket CopyObject, overwrite) and `stat` (exists, size, type, updatedAt) on every adapter; 0.2.0 (owner 2026-11-01) | `feat/srv-180-r2-storage` | STO-009 | DONE | Used by SRV-180…182 |
