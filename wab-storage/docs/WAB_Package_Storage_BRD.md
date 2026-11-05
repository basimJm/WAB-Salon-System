# WAB — Business Requirements Document (BRD)
## Package: `wab-storage`

| Field | Value |
|---|---|
| Document | BRD — `wab-storage` package |
| Version | 2.0 (Cloudflare R2 active, AWS S3 + CDN fallback) |
| Date | 2026-11-04 |
| Repository | Monorepo folder `wab-storage/` |
| Deliverable | **Node.js package (TypeScript, npm)** — server only |
| Consumers | WAB backend (profile photos, business images, gallery, service media, license and medical documents, tattoo design images, exports); future projects |
| Related | Backend BRD, Customer PRD (§3.16), Merchant PRD (M04, M13, M14, M16), Admin PRD (A14, A26). Root `BUSINESS_DOMAIN.md` holds the rules; this package holds none of the business rules |
| Status | Built and used by WAB-Server (`STORAGE_PROVIDER=cloudflare-r2`), version 0.2.0 |

---

## 1. Executive Summary
`wab-storage` handles file storage behind one **interface**. The active provider is **Cloudflare R2** (public + private bucket, owner 2026-11-01); **AWS S3 + CDN** is only a fallback. Clients never upload through the API server: the backend asks `wab-storage` for a short-lived **presigned upload URL**, the app uploads directly to storage, then the backend confirms the upload. Public media is served through the public bucket's URL; private files (business **license and medical documents**, tattoo design images, exports) are only accessible through short-lived **signed URLs**.

The interface allows moving storage later without changing the backend. The file-slot and cleanup-outbox rules live in the backend; the package provides the `copy`, `stat` and `delete` they use.

---

## 2. Business Context
The platform relies heavily on media: business cover/profile images, portfolio galleries (images and videos), service media, staff and customer photos. License and medical documents and tattoo design images are sensitive and must be private. Images and videos are **compressed on the device** before upload; the server generates image size variants (thumbnails) for fast lists.

---

## 3. Goals
| ID | Goal |
|---|---|
| SG-1 | Fast, cheap uploads that don't load the API server. |
| SG-2 | Fast media delivery to users through the public bucket's URL or a CDN. |
| SG-3 | Strict privacy for sensitive documents. |
| SG-4 | Switch storage/CDN provider without backend changes. |

---

## 4. Scope

### 4.1 In Scope
- **Presigned upload URLs** restricted by: purpose, content type, max size, expiry (e.g., 5 minutes), and a server-generated object key.
- **Upload confirmation:** verify the object exists, real type (magic bytes) and size match the request; reject and delete mismatches.
- **Purposes/policies** (defined by the consumer): the backend uses `CUSTOMER_AVATAR`, `MEMBER_PHOTO`, `SALON_COVER`, `SALON_PROFILE`, `GALLERY_IMAGE`, `GALLERY_VIDEO`, `SERVICE_MEDIA`, `CATALOG_IMAGE`, `BANNER_IMAGE` and, private, `LICENSE_DOCUMENT`, `MEDICAL_LICENSE`, `BOOKING_REFERENCE`; exports are private too.
- **Public vs private** storage locations (separate bucket or prefix with private ACL).
- **Public URL building** for public objects (R2 public domain, or CDN on S3); **signed URLs** (short-lived) for private objects.
- **Image variants:** generate thumbnail/medium sizes after upload (via a job/hook) and return their URLs.
- **Copy** and **stat** objects (used by the backend's file slots); **delete** objects (single/bulk) when the backend's cleanup outbox asks; lifecycle rules guidance for orphaned uploads.
- Events for analytics (upload requested, confirmed, rejected).

### 4.2 Out of Scope
- Video transcoding (videos compressed on device; size/duration limits enforced).
- Antivirus scanning (future option).
- Deciding which entity owns a file and permission checks (backend).

---

## 5. Business Requirements
| ID | Requirement | Priority |
|---|---|---|
| STO-01 | Stable interface: `createUploadUrl`, `confirmUpload`, `getPublicUrl`, `getSignedUrl`, `delete`, `createVariants`. | M |
| STO-02 | Presigned URLs restricted by content type, max size and short expiry; object keys generated server-side (never client-chosen). | M |
| STO-03 | Upload confirmation validates existence, real file type and size. | M |
| STO-04 | Per-purpose policies with defaults: images ≤10 MB (jpg/png/webp/heic), videos ≤50 MB and ≤60 s (mp4/mov), documents ≤10 MB (image/PDF). | M |
| STO-05 | License and medical documents, tattoo design images and exports stored privately; accessible only via signed URLs with short expiry (e.g., 10 minutes). | M |
| STO-06 | Public media served through the public bucket's URL (or the CDN on S3) with cache headers. | M |
| STO-07 | Image variants (e.g., thumbnail and medium) generated after upload. | M |
| STO-08 | Delete and bulk delete supported; orphan cleanup guidance (lifecycle rules for unconfirmed uploads). | M |
| STO-09 | Configuration (account, bucket names, region, credentials, public URL or CDN domain) injected by consumer; no secrets in package. | M |
| STO-10 | Provider-independent: Cloudflare R2 (active) and AWS S3 + CDN (fallback) run behind the same interface; another store = a new implementation. | M |
| STO-11 | Emit events for analytics/errors. | S |
| STO-12 | `copy` and `stat` on every adapter (used by the backend's file slots) and `configureBucketCors` for browser uploads. | M |

---

## 6. Non-Functional Requirements
| ID | Area | Requirement |
|---|---|---|
| SNF-01 | Security | Least-privilege credentials; private buckets by default; no public listing. |
| SNF-02 | Security | Validate MIME by content (magic bytes), not by extension only. |
| SNF-03 | Performance | Presigned URL creation <50 ms; direct delivery of all public media from the public URL or CDN. |
| SNF-04 | Cost | Lifecycle rules for temporary/unconfirmed uploads; variants reduce bandwidth. |
| SNF-05 | Quality | TypeScript strict; unit tests with S3 mocks; integration tests in dev bucket. |
| SNF-06 | Versioning | Semantic versioning; private npm registry; changelog. |

---

## 7. Success Metrics
- Upload success rate; average upload time on mobile.
- Image load time.
- Zero publicly accessible license or medical documents.

---

## 8. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Malicious or wrong files uploaded | Type/size validation on confirm; private-by-default; optional AV scanning later |
| Cross-provider latency (API host ↔ object store) | Direct client uploads; direct public delivery; minimal server-side transfers |
| Orphaned files increase cost | Confirm step + lifecycle rules |
| Provider change | Interface-based design |

---

## 9. Open Items
| # | Item |
|---|---|
| 1 | Public domain of the R2 buckets per environment (platform domain is an open owner decision); CloudFront only for the S3 fallback |
| 2 | Image variant sizes (from design) |
| 3 | Antivirus scanning need |
