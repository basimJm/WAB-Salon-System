# wab-storage — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-storage` |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_Storage_BRD.md` |
| Version | 0.0.0 (design only — no code yet) |
| Node | >= 22, TypeScript strict, ESM + CJS builds |
| Server counterpart in WAB | `WAB-Server/src/providers/storage` (interface already in WAB-Server, fake only today) |

## 1. Purpose and boundaries
Presigned upload (purpose-restricted, server-generated keys), upload confirmation (existence, real type by magic bytes, size; rejected objects deleted), public CDN URLs, short-lived signed URLs for private objects, read/write, single/bulk delete, image variants (thumb 320 px, medium 960 px, WebP).

**Not in this package:** Video transcoding, antivirus, deciding file ownership/permissions (backend).

## 2. Architecture
Ports and adapters:
```
consumer ──> createStorage(options) ──> StorageProvider (port, stable interface)
                                       ├── adapters/memory   (dev: local/fake)
                                       ├── adapters/local-fs
                                       ├── adapters/s3
                                       ├── adapters/cdn-url-builder
                                       ├── adapters/sharp-variants
```
- The factory picks the adapter from `options.provider` (+ `options.environment`). Unknown provider → `ConfigError`.
- Adapters never leak vendor types through the port; vendor responses are normalized (§5).
- Shared kernel: `errors/`, `config/` (zod-validated options), `http/` (timeouts, retry with backoff + jitter), `logger` (injected, redacting), `events` (optional hook for analytics).

## 3. Public API (port)
```ts
interface StorageProvider {
  createUploadUrl(r:{key;visibility;contentType;maxBytes;expiresInSec}): Promise<{url;method:"PUT";headers;expiresAt}>;
  confirmUpload(r:{key;visibility;contentType;maxBytes}): Promise<{status:"CONFIRMED";size;contentType} | {status:"REJECTED";reason:"MISSING"|"TYPE_MISMATCH"|"TOO_LARGE"|"EMPTY"}>;
  getPublicUrl(key): string;
  getSignedUrl(r:{key;expiresInSec}): Promise<string>;
  read(key): Promise<Buffer|null>;
  write(r:{key;body;contentType;visibility}): Promise<void>;
  delete(keys: readonly string[]): Promise<void>;
  createVariants(key): Promise<VariantKeys>;
}
createStorage(options): StorageProvider
```

## 4. Configuration
| Option / env key | Dev | Prod | Notes |
|---|---|---|---|
| `provider` | `local-fs`/`s3`(MinIO)/`memory` | `s3` | |
| `environment` | `dev` | `prod` | |
| `s3.region`, `s3.publicBucket`, `s3.privateBucket` | MinIO values | real | no hardcoding |
| `s3.endpoint`, `s3.forcePathStyle` | `http://localhost:9000` (consumer) | unset | dev only |
| `s3.credentials` | MinIO keys | IAM role/keys (secret) | never logged |
| `cdn.baseUrl` | local base URL | CDN domain (https) | |
| `signedUrl.maxTtlSec`, `upload.maxTtlSec` | 600 / 300 | same | |
| `variants` sizes/format/quality | 320/960 webp q80 | same | |
| `timeoutMs`, `retry` | defaults | defaults | |

Rules: values come from the consumer (options/env), defaults live in `constants/`, prod refuses the fake adapter and missing secrets (`ConfigError` naming the key only).

## 5. Status and result mapping (every vendor status handled)
| S3 result | Normalized |
|---|---|
| HEAD 200, type+size ok | `CONFIRMED` |
| 404 / NotFound | `REJECTED: MISSING` |
| magic-bytes type differs | `REJECTED: TYPE_MISMATCH` (object deleted) |
| size > max | `REJECTED: TOO_LARGE` (object deleted) |
| size 0 | `REJECTED: EMPTY` |
| 403 AccessDenied | `AUTH_FAILED` |
| 429/503 SlowDown | `RATE_LIMITED` (retry) |
| 5xx / network / timeout | `VENDOR_ERROR`/`NETWORK_ERROR`/`TIMEOUT` (retry) |
| delete of missing key | success (idempotent) |

Unknown vendor value → `UNKNOWN` + raw response logged (redacted), never success.

## 6. Error model
All failures extend `StorageError` with `code`, `retryable`, `cause`, `details` (no secrets).
| Code | When | Retryable |
|---|---|---|
| `STORAGE_KEY_INVALID` | empty/`..` segments, too long | no |
| `STORAGE_TYPE_NOT_ALLOWED` | content type outside policy | no |
| `STORAGE_ACCESS_DENIED` | IAM/credentials | no |
| `STORAGE_UNAVAILABLE` | network/5xx/timeout | yes |
| `STORAGE_VARIANT_FAILED` | unreadable image (e.g. HEIC) | no (skipped, logged) |
Common codes for every package: `CONFIG_INVALID`, `VALIDATION_FAILED`, `AUTH_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `VENDOR_ERROR`, `MALFORMED_RESPONSE`, `UNKNOWN`.

## 7. Environments
- **dev (localhost):** MinIO on `localhost:9000` through the s3 adapter, or `local-fs`; URLs built from a local base URL.
- **prod:** S3 with IAM credentials, separate public/private buckets, CDN https domain; fake/local refused.

## 8. Performance notes
Reuse one S3 client; presigning is local (no network); stream large bodies; bulk delete in batches of 1 000; variants generated off the request path; read capped by size.

## 9. Testing
- Unit tests: one test file per source file, every exported function: success, each error code, each status mapping, boundaries, idempotent replay. Vendor SDK/HTTP mocked. Coverage gate: 100 % functions, >= 95 % lines/branches.
- Loop test (`npm run test:loop`): 500 iterations of presign → simulated PUT → confirm → variants → signed URL → delete, 20 concurrent, asserts no leftover objects and stable memory.
- Consumer smoke test: install the built tarball into a temp project and call the factory.

## 10. Adoption guide (any project)
```ts
const storage = createStorage({ environment: "dev", provider: "s3", s3: { endpoint, region, publicBucket, privateBucket, credentials }, cdn: { baseUrl } });
const t = await storage.createUploadUrl({ key, visibility: "PUBLIC", contentType: "image/jpeg", maxBytes, expiresInSec });
```
How WAB-Server adopts it: replace `WAB-Server/src/providers/storage` real mode (`*_PROVIDER=real`) with this package; the interface is already compatible (see §3).

## 11. Open questions / assumed-missing requirements
- Video duration limit (60 s) needs media probing — not available from S3 metadata.
- Orphan cleanup: lifecycle rules documented, not enforced by code.
- HEIC decoding availability in `sharp` builds.
- CDN cache invalidation and cache headers policy.
- Bucket/CDN names, region and IAM model are owner decisions.

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (tsconfig strict, eslint, prettier, jest, build, scripts) | ⬜ |
| Shared kernel (errors, config, http/retry, logger) | ⬜ |
| Adapter: memory — in-memory objects for tests | ⬜ |
| Adapter: local-fs — folder on localhost for dev | ⬜ |
| Adapter: s3 — AWS S3 (and S3-compatible: MinIO in dev, DO Spaces) | ⬜ |
| Adapter: cdn-url-builder — public URL = CDN domain + key | ⬜ |
| Adapter: sharp-variants — image variants | ⬜ |
| Unit tests + coverage gate | ⬜ |
| Loop test | ⬜ |
| README + consumer smoke test | ⬜ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
| 2026-10-18 | 0.1.0 | STO-002: kernel: errors, config/options (prod rules), logger redaction, retry/timeout, constants |
| 2026-10-18 | 0.1.0 | STO-003: port types, validation, file-type detection, confirm rule, memory adapter, createStorage |
| 2026-10-18 | 0.1.0 | STO-004: local-fs adapter + createLocalFsHandler (PUT upload, public serving, signed private links) |
| 2026-10-18 | 0.1.0 | STO-005: S3 adapter (presign/confirm/read/write/delete), error mapping, lazy AWS SDK deps, tests with a wire-level S3 emulator |
| 2026-10-18 | 0.1.0 | STO-006: CDN public URL helper, CloudFront signer, signedUrl.mode option |
| 2026-10-18 | 0.1.0 | STO-007: variants via sharp behind an ImageProcessor port; Storage type with createVariants |
| 2026-10-18 | 0.1.0 | STO-007: variants via sharp behind an ImageProcessor port; Storage type with createVariants |
| 2026-10-18 | 0.1.0 | STO-008: ensureDevBuckets, SAMPLE_FILES/UPLOAD_FIXTURES, adapter parity tests |
