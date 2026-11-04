# Remote dev switch (ADM-079): gaps between the panel and the real server

Checked on 2026-10-25 against the current server master in two ways:

- **Local real stack** (`qa/stack.sh` + `qa/seed.mjs`, same code as the hosted dev API): `qa/contract-check.mjs` (every
  admin GET against the generated schemas), `qa/socket-check.mjs` (realtime handshake and events), and a signed-in
  browser pass of the `dev-release` build (36 screens, every request answered 200, no console errors).
- **Hosted dev API** `https://wab-server-dev.onrender.com` (`qa/hosted-check.mjs`, unauthenticated only: no sign-in,
  no credentials sent): health, readiness, 401/404 envelopes, CORS preflight, `/admin` websocket handshake.

Status: **FIXED** (in this branch), **SERVER** (listed in `SERVER_ISSUES.md`, needs the server owner), **OPEN** (panel
feature not built yet, needs a backlog row), **OK** (checked, no gap).

| # | Module | Gap | Fix | Status |
|---|---|---|---|---|
| G1 | Contract (all) | The generated contract was behind the server (SRV-125, SRV-126 and booking `requestedAt` landed after the last `api:sync`) | `npm run api:sync`; mocks updated to the new shapes | FIXED |
| G2 | Alerts | Kind `SALON_DELETION_REQUEST` (raised when an owner asks to delete a salon) was unknown: the alerts list and the acknowledge answer failed validation as soon as one existed | kind added to the domain, filter and both locales | FIXED |
| G3 | Alerts | The server names subjects `SALON`, `REFUND`, `REVIEW`, `CATALOG_REQUEST` (and once `salon`); the panel only knew lower camelCase, so no real alert had a link | `alertLink` normalizes the entity type and sends `SALON_APPLICATION` to the application page; mock alerts use the real spelling | FIXED |
| G4 | Exports | Kinds `CUSTOMERS` and `SALONS` were unknown: an export list holding one failed validation | kinds added with labels in both locales | FIXED |
| G5 | Realtime | A handshake refused by the server middleware (`UNAUTHORIZED` after the access token expired while the socket was down, `UNAVAILABLE` on a rooms lookup failure) is not retried by Socket.IO (`active=false`, measured): the indicator stayed "denied"/"reconnecting" for the rest of the session | the client retries `UNAVAILABLE` with backoff and retries `UNAUTHORIZED` once the session holds a different token; `FORBIDDEN` (wrong scope) still stops | FIXED |
| G6 | Realtime | Event names and payloads | `booking.updated`, `application.created`, `overview.tick` received on the local stack; `alert.created`, `review.created`, `refund.updated` emitted by the same code (`server.ts`, `sockets/adminEvents.ts`); the panel only uses the names to refresh queries, so payload keys do not matter | OK |
| G7 | Hosting | `write-hosting.ts` read only process variables, but the API URL lives in `.env.dev`/`.env.prod` since ADM-087: a dev deploy got `connect-src 'self'` (browser blocks every API call) and a prod deploy failed | reads the variant's `.env` file under the variables (same rule as `vite.config.ts`) | FIXED |
| G8 | Hosted dev | CORS preflight from `http://localhost:4173` and `http://localhost:5173` answers 200 without `Access-Control-Allow-Origin`: the hosted panel (and any local preview) cannot call the hosted API from a browser | set `CORS_ALLOWED_ORIGINS` on Render to the deployed panel origin (+ local preview origins if wanted) | SERVER (S10) |
| G9 | Hosted dev | Health/ready 200, 401 `UNAUTHORIZED` and 404 `NOT_FOUND` envelopes, `/socket.io` path and `/admin` namespace over websocket (refuses no/malformed token with `UNAUTHORIZED`) | — | OK |
| G10 | Alerts | Alert titles are always English (`translate('en', …)`), also in the Arabic panel | SRV-150 (contract 1.4.0) sends `titles {ar,en}`; ADM-096 shows `titles[language]` with `title` as fallback | FIXED (S11) |
| G11 | Alerts / exports | Empty `data` / `params` left out of answers (contract says required) | already read as `{}` (S3) | SERVER (S3) |
| G12 | Alerts | `SALON_APPLICATION`, `REVIEW_PENDING`, `CATALOG_REQUEST` alerts come from the periodic `alerts:evaluate` job, so `alert.created` arrives minutes after the event (the `application.created` event itself is immediate) | — | OK (by design) |
| G13 | Catalog requests | SRV-125: approval may map to an existing catalog service (`{catalogServiceId, reason}`) | ADM-093: approve drawer offers "Use an existing service" (active services that fit the business: type and audience); id checked by the generated schema since ADM-096 (S6 fixed by SRV-151) | FIXED |
| G14 | Exports | SRV-126: customers and salons exports exist on the server | ADM-094: export menu on the customers and salons lists (CUSTOMERS / SALONS with the list filters); `cityId` checked by the generated export union since ADM-096 | FIXED |
| G15 | Bookings | `requestedAt` (when the customer sent the request) | ADM-095: "Requested" column on the bookings list and a row in the booking details (Amman, 12-hour) | FIXED |
| G16 | QA kit | `qa/stack.sh` failed to start the server when `WAB-Server/.env.development` enables the real notifier; repeated runs hit the admin login rate limit | `stack.sh` exports `NOTIFIER_PROVIDER`/`OTP_PROVIDER`/`PAYMENT_PROVIDER=fake`; `QA_ADMIN_TOKEN` reuses one sign-in | FIXED |
| G17 | Contract (all) | Contract 1.5.0 (SRV-150 alert titles + subject enum, SRV-151 id patterns and branch status messages) | ADM-096: `npm run api:sync`; id overrides removed (repositories and mocks use the generated schemas, `optionalQuery` for the branch-aware endpoints); alerts read `titles`; the mock answers branch status refusals with the server's wording | FIXED (local stack still runs the pre-1.4.0 server build: re-run `qa/contract-check.mjs` after it is rebuilt) |

Contract check result after the fix: 66 `OK`, 2 `BAD` = S3 only (handled in the repositories), 5 `SKIP`/`STATUS 400` =
operations that need ids or query values the script does not invent.
