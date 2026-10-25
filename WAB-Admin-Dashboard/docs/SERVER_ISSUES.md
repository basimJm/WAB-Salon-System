# Server issues found while testing the panel against the real server (2026-10-19)

Found with `qa/` (real WAB-Server, MongoDB, Redis, MinIO). The panel works around the first five; the rest need the server owner.

| # | Where | What happens | Panel workaround |
|---|---|---|---|
| S1 | CORS (`CORS_ALLOWED_HEADERS`) | `Idempotency-Key` is not allowed, so a browser blocks any admin request that carries it; the OpenAPI does not declare it either | `POST /exports` no longer sends it |
| S2 | `POST /campaigns` validation | `scheduledAt: null` passes `z.coerce.date()` and becomes 1 Jan 1970 ("send now" shows 1970) | the key is left out for "send now" |
| S3 | `GET /alerts`, `GET/POST /exports` | an empty `data` / `params` object is left out of the answer although the contract lists it as required | read as `{}` |
| S4 | `POST /exports` kind `BOOKINGS` | the builder throws `Cannot read properties of undefined (reading 'statuses')` when the job has no params | "no filter" is sent as every status |
| S5 | exports `CSV` and `PDF` on the real S3 storage | the job fails with `STORAGE_VALIDATION_FAILED` (XLSX works) | none: the panel shows the failed export |
| S6 | OpenAPI id pattern | `^[a-f0-9]{24}$/i` matched no real id | FIXED by SRV-151 (contract 1.5.0, `^[a-fA-F0-9]{24}$`); ADM-096 removed `data/api/objectId.ts` and every hand-written id override: repositories use the generated schemas (`tests/contract-ids.test.ts`) |
| S7 | booking `reassign` / `eligible-staff` | only an `APPROVED` booking that has not started is accepted (422 `INVALID_TRANSITION` otherwise); the OpenAPI does not say so | the button shows only then |
| S8 | `GET /salons/{id}/payout-details` | 503 when `PAYOUT_ENCRYPTION_KEY` is not set (documented; `qa/stack.sh` sets one) | none |
| S9 | fake storage provider | an upload cannot be simulated from outside, so licences cannot be confirmed in dev | run MinIO (`qa/stack.sh`) |
| S10 | Hosted dev API (Render) `CORS_ALLOWED_ORIGINS` (2026-10-25) | the preflight answers 200 with no `Access-Control-Allow-Origin` for `http://localhost:4173` / `:5173`, so a browser cannot call the hosted API from the panel; the websocket handshake works (no CORS) | none: add the deployed panel origin (and local preview origins if wanted) on Render |
| S11 | Alert titles (`alerts.service.ts` `title()`) | stored with `translate('en', …)`, so the Arabic panel showed English titles | FIXED by SRV-150 (contract 1.4.0: `title` in the request language + `titles {ar,en}`); ADM-096: the list shows `titles[language]`, falling back to `title` for older servers |
| S12 | Alert `entityType` | `UPPER_SNAKE` everywhere (`SALON`, `REFUND`, `REVIEW`, `CATALOG_REQUEST`) except `salonDeletion.service.ts` (`salon`) | FIXED by SRV-150 (contract enum, stored lowercase values normalized on read); `alertLink` still accepts both spellings for servers before 1.4.0 |
