# WAB — Business Requirements Document (BRD)
## Package: `wab-storage`

| Field | Value |
|---|---|
| Document | BRD — `wab-storage` package |
| Version | 1.0 |
| Date | October 2026 |
| Repository | Separate repository `wab-storage` |
| Deliverable | **Node.js package (TypeScript, npm)** — server only |
| Consumers | WAB backend (profile photos, salon images, gallery, service media, license documents, exports); future projects |
| Related | Backend BRD, Customer PRD (§3.16), Merchant PRD (M04, M13, M14, M16), Admin PRD (A14, A26) |

---

## 1. Executive Summary
`wab-storage` handles file storage behind one **interface**. Phase 1 implementation: **AWS S3** for storage and a **CDN** for delivery. Clients never upload through the API server: the backend asks `wab-storage` for a short-lived **presigned upload URL**, the app uploads directly to storage, then the backend confirms the upload. Public media is served via the CDN; private files (salon **license documents**, exports) are only accessible through short-lived **signed URLs** for the admin.

The server is hosted on DigitalOcean while storage stays on AWS; the interface allows moving storage later (e.g., DigitalOcean Spaces) without changing the backend.

---

## 2. Business Context
The platform relies heavily on media: salon cover/profile images, portfolio galleries (images and videos), service media, staff and customer photos. License documents are sensitive and must be private. Images and videos are **compressed on the device** before upload; the server generates image size variants (thumbnails) for fast lists.

---

## 3. Goals
| ID | Goal |
|---|---|
| SG-1 | Fast, cheap uploads that don't load the API server. |
| SG-2 | Fast media delivery to users through a CDN. |
| SG-3 | Strict privacy for sensitive documents. |
| SG-4 | Switch storage/CDN provider without backend changes. |

---

## 4. Scope

### 4.1 In Scope
- **Presigned upload URLs** restricted by: purpose, content type, max size, expiry (e.g., 5 minutes), and a server-generated object key.
- **Upload confirmation:** verify the object exists, real type (magic bytes) and size match the request; reject and delete mismatches.
- **Purposes/policies** (configurable): `USER_AVATAR`, `SALON_COVER`, `SALON_PROFILE`, `GALLERY_IMAGE`, `GALLERY_VIDEO`, `SERVICE_MEDIA`, `STAFF_PHOTO`, `LICENSE_DOCUMENT` (private), `BANNER` (admin), `EXPORT` (private).
- **Public vs private** storage locations (separate bucket or prefix with private ACL).
- **CDN URL building** for public objects; **signed URLs** (short-lived) for private objects.
- **Image variants:** generate thumbnail/medium sizes after upload (via a job/hook) and return their URLs.
- **Delete** objects (single/bulk) when entities are removed; lifecycle rules guidance for orphaned uploads.
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
| STO-05 | License documents and exports stored privately; accessible only via signed URLs with short expiry (e.g., 10 minutes). | M |
| STO-06 | Public media served through the CDN with cache headers. | M |
| STO-07 | Image variants (e.g., thumbnail and medium) generated after upload. | M |
| STO-08 | Delete and bulk delete supported; orphan cleanup guidance (lifecycle rules for unconfirmed uploads). | M |
| STO-09 | Configuration (bucket names, region, credentials, CDN domain) injected by consumer; no secrets in package. | M |
| STO-10 | Provider-independent so S3 can be replaced (e.g., DigitalOcean Spaces) by a new implementation. | M |
| STO-11 | Emit events for analytics/errors. | S |

---

## 6. Non-Functional Requirements
| ID | Area | Requirement |
|---|---|---|
| SNF-01 | Security | Least-privilege credentials; private buckets by default; no public listing. |
| SNF-02 | Security | Validate MIME by content (magic bytes), not by extension only. |
| SNF-03 | Performance | Presigned URL creation <50 ms; CDN delivery for all public media. |
| SNF-04 | Cost | Lifecycle rules for temporary/unconfirmed uploads; variants reduce bandwidth. |
| SNF-05 | Quality | TypeScript strict; unit tests with S3 mocks; integration tests in dev bucket. |
| SNF-06 | Versioning | Semantic versioning; private npm registry; changelog. |

---

## 7. Success Metrics
- Upload success rate; average upload time on mobile.
- Image load time via CDN.
- Zero publicly accessible license documents.

---

## 8. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Malicious or wrong files uploaded | Type/size validation on confirm; private-by-default; optional AV scanning later |
| Cross-provider latency (DigitalOcean server ↔ AWS S3) | Direct client uploads; CDN delivery; minimal server-side transfers |
| Orphaned files increase cost | Confirm step + lifecycle rules |
| Provider change | Interface-based design |

---

## 9. Open Items
| # | Item |
|---|---|
| 1 | CDN choice (CloudFront assumed with S3) and domain |
| 2 | Image variant sizes (from design) |
| 3 | Antivirus scanning need |
