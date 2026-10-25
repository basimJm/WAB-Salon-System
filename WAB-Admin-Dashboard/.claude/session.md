# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) checked against the real server (local stack + hosted dev wiring): gap list `docs/REMOTE_DEV_GAPS.md`; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

### ADM-093 — Catalog request approval can map to an existing catalog service (SRV-125)

- Branch: `feat/adm-093-catalog-map-existing` (from `origin/admin`)
- Status: IN REVIEW
- Acceptance criteria (PRD A23 Requests "creates or maps to a catalog service"; gap G13; operation postCatalogRequestsByIdApprove body = `{catalogServiceId, reason}` | `{name, description, imageKey?, sortOrder?, reason}`; getSalonsById, getCatalogServices):
  - [x] Approve drawer has a "Create a new service" / "Use an existing service" switch (SegmentedControl, AR+EN); create keeps the old translate-and-create form
  - [x] Map lists only ACTIVE catalog services of the salon's gender (the server answers 404 / GENDER_MISMATCH otherwise) and sends only `{catalogServiceId, reason}`; loading, empty ("no active service for this audience") and error states; a service and a reason are required
  - [x] Domain: `ApproveInput` = `CreateServiceApproval | MapServiceApproval`, pure `approveProblems` / `approveInputOf`; data: `approveBodySchema` re-checks the id with OBJECT_ID (the generated pattern refuses every real id, S6)
  - [x] Mock: the request belongs to Noor Salon (women's) of the salon fixtures; approve keeps the mapped id; G13 FIXED in `docs/REMOTE_DEV_GAPS.md`
- Tests: tests/catalog-approve.test.tsx (8: draft rules, body mapping, schema vs S6, gender-filtered options + sent id, empty + field error, salon read error); tests/catalog-requests.test.tsx unchanged green; `sh scripts/gate.sh` GATE OK
- Browser check (dev-release built against the local real stack on 127.0.0.1:4000, preview :4174, signed in as the QA admin; two QA requests created for Noor Salon through the merchant API): EN LTR dark 1280 px: map mode lists the 11 women's services, empty reason refused, mapped "Hair spa QA" to "Blow dry" → server 200 `status APPROVED, catalogServiceId` = the picked id, row left the pending list; AR RTL light 375 px: Arabic labels and service names, drawer 392 px of 405, no horizontal page scroll, create mode shows the four AR/EN fields; console clean
- Loops: 1/1 — re-checked each criterion against the code, the tests and the real server answer; found the missing salon-error test and added it
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — no contract hand edit, uses already-consumed operations, salon/catalog queries only run in map mode. DEVIATIONS: options = first page of 100 services of that gender (same limit as the salon menu picker; no typeahead endpoint); no e2e (user decision); the "Blow dry QA" request was left pending on the shared stack.

## Last blocks

### ADM-079 — Switch to `remote` on dev (INT-05): per-module gap list and fixes, socket events verified against the real server

- Branch: `feat/adm-079-remote-dev` (from `origin/admin`)
- Status: IN REVIEW
- Acceptance criteria (task row; operations: all 116 admin GETs via `qa/contract-check.mjs`, getAlerts/postAlertsByIdAcknowledge, getExports*, getBookings*, postCatalogRequestsByIdApprove; realtime `/admin` namespace, BUSINESS_DOMAIN §7):
  - [x] Gap list per module in `docs/REMOTE_DEV_GAPS.md` (G1–G16: FIXED / SERVER / OPEN / OK) from the contract check, the socket check and a signed-in browser pass of `dev-release` on the local real stack (same server code as dev)
  - [x] Client fixes: contract re-synced (SRV-125/126, `requestedAt`); alert kind `SALON_DELETION_REQUEST` and export kinds `CUSTOMERS`/`SALONS` (AR+EN); `alertLink` reads the server's UPPER_SNAKE/camelCase subjects and sends applications to their page; mocks use the real shapes
  - [x] Realtime: event names match `WAB-Server/src/constants/{sockets,alerts}.ts`; received `booking.updated`, `application.created`, `overview.tick` live; handshake refusals measured (`active=false`): client now retries `UNAVAILABLE` with backoff and `UNAUTHORIZED` once the token changed, `FORBIDDEN` stops
  - [x] Hosted dev wiring: `.env.dev`/`.env.prod` resolve to the Render host in the bundle; `write-hosting.ts` now reads the variant `.env` file (CSP `connect-src` had only `'self'`); hosted health/ready 200, 401/404 envelopes, `/admin` websocket refuses no/malformed token with UNAUTHORIZED; CORS preflight has no allow-origin (S10)
  - [x] Server-side defects in `docs/SERVER_ISSUES.md` (S10 hosted CORS, S11 English alert titles, S12 entity type spelling); QA kit: `qa/socket-check.mjs`, `qa/hosted-check.mjs`, `QA_ADMIN_TOKEN`, fake providers in `qa/stack.sh`
- Tests: tests/socket-client.test.ts (+5: FORBIDDEN, UNAUTHORIZED token wait, UNAVAILABLE backoff, transport errors, backoff cap), tests/alerts.test.tsx (+2 + updated link), tests/exports.test.tsx (+1), tests/hosting.test.ts (+2); `sh scripts/gate.sh` GATE OK (1226+ tests)
- Browser check (dev-release built against the local stack, signed in as the QA admin): 36 screens in AR RTL light desktop, every request 200, no error alerts, console clean; alerts in EN LTR dark 375 px (links to /reviews and /salons/applications/:id, "Salon deletion request" filter, no horizontal overflow) and exports list
- Loops: 1/1 — re-ran the contract check and socket check after the fixes (66 OK, 2 BAD = S3 handled), re-checked each gap row against the code and the measured answers; found the CSP/env gap (G7) and the stale contract (G1) in this pass
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — fixes stay in data/domain/scripts, no contract hand edits, retry timers cleared on disconnect. DEVIATIONS: hosted checks are unauthenticated only (by instruction, no credentials to Render), so module flows were run on the local stack, not on Render; `alert.created`/`review.created`/`refund.updated` not received live (raised by the evaluate job / need a completed or paid booking; checked in the server code); G13–G15 (catalog map-to-existing, customers/salons export buttons, `requestedAt`) left OPEN for new backlog rows; no e2e (user decision); root `session.md` index line left to the lead.

### DOCS — ADM-079 DONE; gap rows ADM-093…095 + SRV-150

- Branch: `docs/adm-079-done-gap-rows`
- Status: DONE
- Acceptance criteria:
  - [x] ADM-079 DONE (PR #449); open gaps G13–G15 become ADM-093 (catalog map to existing), ADM-094 (customers/salons exports), ADM-095 (booking `requestedAt`); server issues S11/S12 become SRV-150
  - [x] `tasks.py check` OK (only the known CUS-047 note); board regenerated
- Tests: `python3 scripts/tasks.py check`
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — backlog only, no code.
