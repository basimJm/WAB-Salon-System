# wab-storage

Provider-independent file storage for WAB projects: presigned direct uploads, confirmation by the
real file content, public CDN URLs, short-lived signed URLs for private files, server-side
read/write/delete and image variants. Adapters: `s3` (AWS S3, MinIO, DigitalOcean Spaces),
`local-fs` (dev on localhost) and `memory` (tests). No WAB business rules live here.

## Quick start

```ts
import { createStorage } from 'wab-storage';

const storage = createStorage({
  environment: 'prod',
  provider: 's3',
  s3: { region, publicBucket, privateBucket }, // credentials: IAM role, or { accessKeyId, secretAccessKey }
  cdn: { baseUrl: cdnBaseUrl }, // https in prod
});

// 1. The server hands the client a short-lived upload URL (the key is always server-generated).
const target = await storage.createUploadUrl({
  key: 'salons/cover/42/abc.jpg',
  visibility: 'PUBLIC',
  contentType: 'image/jpeg',
  maxBytes: 10_000_000,
  expiresInSec: 300,
});
// 2. The client PUTs the file to target.url with target.headers.
// 3. The server confirms; wrong or oversized files are rejected AND deleted.
const result = await storage.confirmUpload({
  key,
  visibility: 'PUBLIC',
  contentType: 'image/jpeg',
  maxBytes,
});
if (result.status === 'CONFIRMED') await storage.createVariants(key); // x_thumb.webp, x_medium.webp
```

## API (`Storage`)

| Method                                                                    | Purpose                                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `createUploadUrl({key, visibility, contentType, maxBytes, expiresInSec})` | Presigned `PUT`, pinned to the content type                                                                  |
| `confirmUpload({key, visibility, contentType, maxBytes})`                 | `CONFIRMED` or `REJECTED` (`NOT_FOUND`, `EMPTY`, `TYPE_MISMATCH`, `TOO_LARGE`); rejected objects are deleted |
| `getPublicUrl(key)`                                                       | CDN URL (pure)                                                                                               |
| `getSignedUrl({key, expiresInSec})`                                       | Short-lived URL for a private object (S3 presign or CloudFront)                                              |
| `read(key)` / `write({key, body, contentType, visibility})`               | Server-side bytes (e.g. variants); `read` returns `null` when missing                                        |
| `delete(keys)`                                                            | Any number of keys, batched, missing keys ignored                                                            |
| `createVariants(key)`, `variantKey(key, name)`, `variantKeys(key)`        | 320 px / 960 px WebP beside the original                                                                     |

Every failure is a `StorageError` with `code`, `retryable`, `cause` and `details` (no secrets).
Retryable errors (rate limit, timeout, network, 5xx) are retried with capped backoff and jitter.

## Environments

- **dev:** `provider: 'memory'` (tests), `'local-fs'` (+ `createLocalFsHandler` to serve uploads on localhost) or `'s3'` with `endpoint` + `forcePathStyle` for MinIO; `ensureDevBuckets(options)` creates the buckets.
- **prod:** `provider: 's3'`, https CDN, separate public/private buckets; the memory and local-fs adapters are refused at start-up with a `StorageError` that names the field.

## Testing your code

`createStorage({ provider: 'memory', ... })` returns an in-memory store; `UPLOAD_FIXTURES` and `SAMPLE_FILES` give valid and invalid uploads for every rejection reason.

## Scripts

`npm run verify` runs typecheck, lint, format check, unit tests with the coverage gate (100 % functions, 95 % lines/branches), build, a consumer smoke test of the packed tarball (CJS + ESM) and the loop test (`npm run test:loop`).
