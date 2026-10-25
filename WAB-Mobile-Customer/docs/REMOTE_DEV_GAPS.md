# Remote dev API — gap list (CUS-060)

Dev builds use `DATA_SOURCE=remote` against `DEV_API_BASE_URL` (Android `gradle.properties`) / `API_BASE_URL` (iOS `Dev.xcconfig`), both the hosted dev API; `scripts/ci/tests/test_dev_remote_config.py` keeps them on `remote` and on the same host.

How the shapes were checked (2026-10-25):
- `scripts/capture_remote_fixtures.py` captured the real envelope of **46 operations** into `core/data/fixtures/remote/<OperationId>.json`: public, read-only ones from the hosted dev API; authenticated ones (bookings, drafts, favorites, notifications, profile, reviews, installations, auth) from the local real stack (same server code, fake OTP provider), on a throwaway customer that the script deletes at the end. Tokens and pre-signed URLs are redacted; local media URLs are rewritten to the dev CDN.
- `scripts/contract_gaps.py` compares every captured envelope with its OpenAPI success schema (missing required field, null, wrong type, enum value, undeclared field): **0 gaps**.
- `api_sync.py` embeds the captured envelopes in `MockFixtures` (mock mode now serves real shapes; `MockFixtures.captured` lists them) and generates `ContractDecoders` (commonTest). `ContractFixturesTest` decodes every fixture with the generated DTOs and the app's own `NetworkJson`; each feature has a `Real*Fixture(s)Test` that runs its mappers on the captured responses.
- Socket.IO: a throwaway customer connected to `/customer` on the local stack, booked and cancelled.

Re-capture: `python3 scripts/capture_remote_fixtures.py --public-base <dev API> --auth-base <local stack> --phone <seeded customer>` then `python3 scripts/contract_gaps.py` and `python3 scripts/api_sync.py`. Never point `--auth-base` at a hosted server (the script refuses).

## Gaps

| # | Feature | Gap | Fix | Status |
|---|---|---|---|---|
| 1 | Contract (all) | Generated DTOs were behind the server master: drafts `branch`, bookings `requestedAt` | `api_sync.py` re-run (snapshot c5615436) | Fixed |
| 2 | Contract (all) | Mock fixtures were schema samples (`id-1`, slot `09:00`, `1.5` counts), not what the server sends | Captured envelopes replace the samples for 46 operations; `data` is written last so the Empty scenario also clears paginated lists | Fixed |
| 3 | Contract (all) | No test failed when the server shape drifted from the DTOs | `ContractFixturesTest` (every fixture decodes; every operation the app calls is captured, except #11) + per-feature real-fixture tests | Fixed |
| 4 | Booking (S16 step 2) | `POST /salons/{id}/availability` `others[]` was sent without `end` (`end = null` is dropped by `explicitNulls = false`); the server requires `start` and `end` (`z.coerce.date()`), so a companion with a specific staff member broke the slots call with `VALIDATION_ERROR` | `DraftPerson.end` stores the picked slot's end; `others` only carries picks with staff, start and end | Fixed |
| 5 | Realtime | `booking.updated` carries the booking summary without `updatedAt`; the client de-duplicated on `id + status`, so a second real change with the same status (staff reassignment, payment change) never refreshed the screen | Key = `id + status + paymentStatus (+ updatedAt)`; a repeat counts as a duplicate only within 5 s (`RealtimeRefreshDefaults.DUPLICATE_WINDOW`) | Fixed |
| 6 | Realtime | Verified on the local stack: `booking.updated` (`id, referenceNumber, status, paymentStatus, hasBride, appointmentStart, appointmentEnd, respondBy, total, personsCount`) on create and cancel, `notifications.unread` `{count}` on every change, bad token → `connect_error` `{message, data:{code:"UNAUTHORIZED"}}` | Protocol test with the captured frames | Verified |
| 7 | Errors | Server error codes (50) = app `ErrorCode` (+ `UNKNOWN`); error `details[]` = `{field, code, message}`; 404 `SALON_NOT_FOUND`, bad id / gender / slug `VALIDATION_ERROR` | — | Verified |
| 8 | Home | Guest `/home`: `firstName` and `unreadCount` are null, `nearest` is null without coordinates and `{items, hasMore}` with them (one entry per branch, `title`, `distanceKm`) | Mapper defaults already handle it; fixture captured with coordinates so mock mode shows the nearest row | Verified |
| 9 | Salons / filters | `serviceIds` accepted repeated and comma-separated; `/salons/filters` answers 400 without `serviceIds` — the app only asks with a selected service | — | Verified |
| 10 | Push | Notification `data.deepLink` is a relative path (`/bookings/{id}`); `DeepLinks.parse` accepts only website salon links, so a tapped push opens S19 (PRD §10.2 fallback); the in-app row opens the booking through `bookingId` | — | Open (server: absolute link or documented path scheme) |
| 11 | Profile picture | `POST /uploads/confirm` and `PUT /profile/avatar` not captured (needs a real image upload to the storage); their schema samples stay | — | Open |
| 12 | Mock mode | Captured responses are English (`Accept-Language: en`); in mock mode the Arabic UI shows English data for captured operations | — | Open (re-capture per language if needed) |
| 13 | Contract (server) | Spec says `others[].start/end` are nullable (`["string","null"]`) but the server rejects null/missing (see #4) | — | Server-side |
| 14 | Contract (server) | ObjectId patterns in the spec read `^[a-f0-9]{24}$/i` (the regex flag leaked into the string); clients that validate patterns would reject every id | — | Server-side |
| 15 | Data (server) | Dev seed: "Lamar Beauty Lounge" returns Arabic `locationText` / `shortDescription` for `Accept-Language: en` (no English text in the seed) | — | Server-side (seed) |
| 16 | Environments | Android `PROD_API_BASE_URL` points at the dev host while iOS Prod uses the placeholder `api.template.app` | — | Open (owner: platform domain) |
| 17 | Auth / catalog / profile | The customer auth, banners, catalog and profile routers are mounted with the OTP limiter (20 requests / minute / IP, `OTP_ROUTE_RATE_LIMIT`, `modules/customer/index.ts`); during the capture `GET /profile` answered `RATE_LIMITED`. The app maps the code (AR + EN text), but browsing the catalog under the OTP budget looks unintended | — | Server-side (to confirm) |
