# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-183 — Tattoo studios (owner 2026-11-03)

- Branch: `feat/srv-183-tattoo` (batch SRV-183…186, rules §3.13: commit per task, next task branches from this one)
- Status: IN REVIEW (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §5.23, §2 `BusinessType`/`UploadPurpose`, §3.5 `BookingPerson.referenceImageKey`, §5.19; operations `POST /customer/v1/bookings/drafts`, `GET /{customer,merchant,admin}/v1/bookings/{id}`, `POST /customer/v1/uploads/presign`, `POST /merchant/v1/salon/applications`, admin catalog):
  - [x] `BUSINESS_TYPES` + `TATTOO`; audience fixed BOTH (`FIXED_AUDIENCE`), so application, admin audience change and owner widening refuse anything else (`AUDIENCE_CHANGE_NOT_ALLOWED`), no bride (`brideAllowed` = SALON only), mixed persons; catalog/requests/placements/admin filters take the type through the existing per-type code
  - [x] Application: TATTOO with the trade license only (no medical license; owner confirmed)
  - [x] Upload purpose `BOOKING_REFERENCE` (private image, customer scope) + slot `bookings/{id}/persons/{i}/reference`
  - [x] Drafts: optional `persons[].referenceImageKey`; only TATTOO (`BUSINESS_TYPE_MISMATCH`, checked before any upload lookup), each a confirmed customer-own `BOOKING_REFERENCE` upload; echoed in the draft view; copied to the booking
  - [x] New booking: images moved into the person's file slot (`key?v=n`) after creation; a failed move is logged and keeps the booking with the confirmed upload key
  - [x] Booking details (customer, merchant, admin): `persons[].referenceImageUrl` = 5-minute signed URL or null
  - [x] Demo: 4 TATTOO catalog services (BOTH) + Black Needle Studio (1 branch, Recommended); `docs/DEMO_ACCOUNTS.md`
  - [x] Contracts customer 1.11.0, merchant 1.11.0, admin 1.14.0 (additive; CUS-104, MER-084, ADM-111)
- Tests: `tests/tattoo.test.ts` (new, 9: rules, catalog schema, upload policy + slot key, image rules, mover incl. failure + ownership, signed URL, demo catalog + studio), `tests/bookingDrafts.test.ts` (+3: tattoo mixed persons + image checked as own upload, bride/unconfirmed refused, image at salon/clinic refused), `tests/bookingQueries.test.ts` (+1 signed URL, null otherwise), `tests/businessTypes.test.ts`, `tests/search.test.ts` (fake lookup per type), `tests/uploads.test.ts` (private purposes)
- API docs: customer/merchant/admin regenerated + bumped
- Gate (Terminal panel): prettier, eslint, tsc, docs, full jest 176 suites / 3059 tests — 2 failures (search fixture returned salon ids for every non-clinic type; upload policy test listed the private purposes), fixed; the 8 affected suites (173 tests) + lint green after
- Loops: 1/1 — re-read §5.23 point by point (type, BOTH, no bride, no age check, catalog per type, one optional image per person, private + signed, trade license) against rules, schemas, draft, creation, details and the demo
- Review: PASSED (SE ✔ (one helper module for the image rule, mover and URL; repository update only), Mobile ✔ (additive fields; CUS-104 / MER-084 named), Architect ✔ (three contracts bumped; storage through FileSlots + outbox), PM ✔ (owner answers 1–4 applied), UX N/A, Marketing N/A, QA ✔ (rule, refusal, ownership, failure, demo tests))
- Notes: DEVIATION — the full suite was not re-run after the two fixture fixes (affected suites only; the next task's gate runs it). Design images are not deleted when an account is purged (bookings are kept for history; retention not decided). The merchant cannot upload a design image yet (SRV-185 adds the merchant scope with `BOOKINGS_CREATE`).

## Last blocks

### SRV-182 — Every module on the file lifecycle (owner 2026-11-01)

- Branch: `feat/srv-180-r2-storage` (batch SRV-180…182 on one branch)
- Status: DONE (PR #605)
- Acceptance criteria (BUSINESS_DOMAIN §3.7 file slots + storageCleanups; operations PUT/DELETE `/customer/v1/profile/avatar`, PATCH `/merchant/v1/salon/profile`, `/merchant/v1/team/members[/{id}]`, PATCH `/merchant/v1/me`, `/merchant/v1/salon/services/{id}`, DELETE `/merchant/v1/salon/gallery/{id}`, `/merchant/v1/salon/application/resubmit`, admin catalog / banners / catalog requests / salon edit):
  - [x] Slots (same key + version, replaced in place): customer avatar, salon cover + logo (`profileKey`, merchant and admin edit), member photo (team create/update + own profile), catalog image (admin create/update + approved catalog request), banner image per language
  - [x] Lists queue what they drop: service media, gallery item files (now through the outbox instead of a best-effort delete), license + medical-license documents replaced on resubmit, catalog-request images (rejected, mapped to an existing entry, or replaced by the admin's)
  - [x] Customer purge removes the avatar slot (record + objects queued) instead of a direct delete
  - [x] Request schemas of every slot field accept the returned reference `key?v=n` (an app may send back what it read): merchant 1.10.0, admin 1.13.0 (additive, no client change; customer avatar body had no pattern)
  - [x] No module deletes stored objects directly any more (grep: only the outbox and the provider); every write goes through `StorageProvider`
- Tests: `tests/fileSlots.test.ts` (12: create, read URL with version, replace keeps file id + key, no duplicate, old content replaced, legacy key queued, delete DB-first + idempotent, live slot kept, demo never queued, vanished temp / copy failure keep the old file, failed deletion retried with backoff, cross-tenant refused, concurrent replacements serialised), `tests/adminImageSlots.test.ts` (5), updated `customerProfile`, `team`, `memberSelf`, `salonProfile`, `adminSalonEdit`, `gallery`, `salonServices`, `accountLifecycle` suites (`tests/helpers/fileSlots.ts` kit: real slots + outbox over fake models)
- API docs: merchant 1.10.0, admin 1.13.0 regenerated (patterns only)
- Gate (Terminal panel): prettier, eslint, tsc, build, `npm run docs` (no drift), full jest 175 suites / 3044 tests green; wab-storage `npm run verify` (216) + loop green
- Loops: 1/1 — re-checked the owner's spec point by point (R2, central service, CRUD lifecycle, per-module prefixes, metadata, entity integration, consistency, security, tests); found and fixed during the loop: slot fields refused the returned `?v=` reference (contract break for apps that echo values), the first FILE_REF pattern refused dotted single-segment keys (banners), the admin image wrapper ran rules after copying (now before)
- Review: PASSED (SE ✔ (one FileSlots + one outbox, DB written before objects are queued, locks per slot, idempotent deletes), Mobile ✔ (no app change: same request/response shapes, URLs gain `?v=`), Architect ✔ (additive contracts, R2/S3 by env, demo assets protected, Phase 2 untouched), QA ✔ (spec tests 1–12; migration test not applicable))
- Notes: DEVIATIONS / LIMITS — (1) temporary upload keys keep the existing prefixes (`customers/`, `salons/cover/`, `gallery/`, `services/`, `licenses/`…); only slot keys follow the new per-entity layout, multi-file items keep one key per file (no `documents/{ownerType}/{ownerId}/` move); (2) `originalName` is not stored (the presign request has no file name; adding it is an API change); (3) there are no booking attachments in the product, so nothing to integrate; (4) salon deletion only takes a salon offline (history kept), so it deletes no files; exports are never deleted (retention not decided); (5) if the entity write fails after the copy, the slot already holds the new content while the entity keeps the previous version number (same key: the image is right, only a cache may be stale); (6) slot rows of salon-owned images record `ownerType: MEMBER`, `ownerId = salonId` (+ `salonId`), admin images `ADMIN`; (7) no S3→R2 migration tool (owner) and no run against real R2 (no credentials).

### SRV-181 — File slots: same-key replacement + reliable cleanup (owner 2026-11-01)

- Branch: `feat/srv-180-r2-storage` (batch)
- Status: DONE (PR #605)
- Acceptance criteria (BUSINESS_DOMAIN §3.7, updated in this batch):
  - [x] `uploads` rows: `slot`, `version`, `size`, status `CONSUMED`; one row per slot key, kept across replacements (file id stable)
  - [x] `FileSlots.replace`: ownership via `assertConfirmed`, server-side copy temp → slot key under a per-slot Redis lock, `stat` for size/type, version $inc, variants regenerated, entity commit, temp `CONSUMED` + queued, older plain key queued; `remove`: entity first, then record + objects queued
  - [x] References `key?v=n`: the provider builds versioned public URLs, strips the version for reads/deletes/signing, `variantKey` keeps it
  - [x] `storageCleanups` outbox + `periodic.storage-cleanup` (every 5 min) + drain after enqueue: batch delete, backoff retries (no give-up), live slots skipped, `demo/` keys never queued, malformed keys refused
- Tests: see SRV-182 (`tests/fileSlots.test.ts`)
- Loops: 1/1 — covered by the SRV-182 batch loop
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — see SRV-182
- Notes: lock = 30 s TTL, waits up to ~5 s, then 409.
