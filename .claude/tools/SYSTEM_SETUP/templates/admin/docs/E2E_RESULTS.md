# Admin panel: end-to-end results on the local real stack (ADM-107, 2026-10-27)

Owner request: adopt the new server changes and test every admin feature end to end until it works; collect blocks.

## Setup

- Server: local real stack from `qa/stack.sh` (includes SRV-170, admin contract 1.7.0) at `127.0.0.1:4000`, MinIO `:9000`, Redis `:6380`. Not restarted, seeds not re-run.
- Panel: `dev-release` built with `VITE_API_BASE_URL`/`VITE_SOCKET_URL` = the local server, served with `vite preview` on `localhost:4174`.
- Admin: `qa.admin@example.test` (password from `qa/stack.sh`), email OTP read with `qa/lib.mjs adminOtp()`.
- Tools: a Playwright sweep (real Chrome, headless) over every module route plus the first detail page of each record list, in six combinations (AR light 1440, EN dark 1440, AR dark 768, EN light 768, AR light 375, EN dark 375), measuring horizontal overflow, error states, sign-out, console errors/warnings and failed requests; then the actions below driven by hand in the Playwright browser (EN, 1440).
- Render dev (`app-server-dev.onrender.com`) was not used (old server; no credentials sent there).

## Results

| Area | What was done | Result |
|---|---|---|
| Sign-in + email OTP | credentials → OTP step → code from Redis → `/live` | Pass. Session in this tab's `sessionStorage` only (no `localStorage`), access token 15 min |
| Session lasts 2 days (ADM-097) | read the stored session; settings screen | Pass. Refresh lifetime 48 h; server `admin.sessionIdleSec` = 172800 |
| Sweep: 42 module routes + 4 detail pages × 6 combinations (276 visits) | layout, errors, console | Pass after the fixes below: no horizontal scroll at any width, no error states, never signed out, `dir`/theme correct, only console item = the 404 staff photo (server data, see S4) |
| Overview, analytics boards, journey | open every board | Pass (real numbers where the server has them; "no data yet" elsewhere, as built in ADM-099) |
| Customers | list, details (profile, reviews written, notifications), Block → Unblock with reason | Pass; audit rows CUSTOMER_BLOCK / CUSTOMER_UNBLOCK |
| Salons | list, details, Take offline → Put online with reason (empty reason refused), insights, admin activity, payout details, members, Branches tab | Pass after fix F4 (Branches tab failed) |
| Applications queue | list | Empty on this stack (no pending application): approve/reject not exercised (see blocks) |
| Bookings (ADM-107) | list, filters (status, payment, bride, tabs, salon → branch, search), rejected rows show the reason under the status, details: staff with photo/initials, per-person staff, rejection/cancellation reason, `Still to pay at the salon` 0 once final, `Paid at the salon` on COMPLETED | Pass. Completed WAB-BW1JEZ: still to pay 0.000, paid at salon 22.500 JOD |
| Booking admin actions | Change status PENDING → APPROVED with reason (history: Admin + reason); Cancel as the salon (Cancelled by salon, refund pending, reason "Admin action · …"); Reassign (dialog opens, server lists no eligible staff for that booking); Refund (over-max refused in the form; 1.000 JOD refused by the server, S1) | Pass except the server refund 500 (S1) |
| Transactions / refunds / payouts / subscriptions / reconciliation | lists + transaction details | Pass |
| Reviews moderation | Approve, Reject with reason; sidebar counter 84 → 82 | Pass |
| Catalog | Add a service (validation, image upload presign → MinIO → confirm, reason) | Pass after fix F5 (Save was off screen) |
| Banners, recommended, legal pages, FAQ, contact | lists; banner editor opens | Pass |
| Push notifications | compose, audience size (≈26 people) | Pass (not sent) |
| Reports + exports | daily report; bookings export XLSX and PDF ready + download; CSV | XLSX/PDF pass; CSV fails on the server (S2) |
| Alerts bell | dropdown with latest NEW alerts, mark one read: badge 22 → 21 | Pass |
| Settings | change radius 10 → 11 with reason, reload shows 11, Use default → 10 | Pass |
| Audit log | every action above appears with action code, reason, IP, device | Pass |
| Staff / admins and roles | — | Not available: no admin-user/role screen in the PRD (A00–A29) and no `/admin/v1/admins` endpoints (see blocks) |

## Admin defects found and fixed (all with unit tests)

| # | Defect | Fix |
|---|---|---|
| F1 | Staff photo that fails to load (seeded URL answers 404) left a broken image | `Avatar` falls back to initials on `error`, retries when the URL changes |
| F2 | Booking details showed raw `PAY_ON_ARRIVAL` / `NONE` | payment method and refund status worded (AR/EN) |
| F3 | Booking status history showed raw `CUSTOMER` / `ADMIN` actors; search label promised salon search the server does not do | actor in words; label "booking reference, customer name or phone" (salon has its own filter) |
| F4 | Salon Branches tab and the bookings branch filter: "The server sent an unexpected response" | branches list no longer requires pagination `meta` (not paginated; server omits it, S3) |
| F5 | Side drawers grew past the window (979 px in 822 px) so Save was unreachable on long forms | drawer overlay row bound to the viewport; body scrolls (measured: drawer 822 px, saved) |
| — | Bookings strings pushed the dev-release entry chunk over its 80 KB budget | `bookings` locale area is lazy (`locales/lazy/*`, `useLazyStrings(bundle)`), like analytics |

## Server defects (not changed here)

| # | Endpoint / request | Expected | Actual |
|---|---|---|---|
| S1 | `POST /admin/v1/bookings/{id}/refund` `{"amount":"1.000","reason":"…"}` on a FULLY_PAID seeded booking (WAB-2Y0C81) | refund created, or a business error (4xx with a code) when the provider cannot refund | `500 INTERNAL`; log: `RangeError: unknown payment session` from `FakePaymentProvider.refund` (seeded payments have no provider session). Errors from the provider should map to a refund failure, not a 500 |
| S2 | `POST /admin/v1/exports` kind `BOOKINGS` format `CSV` | export READY | export FAILED; worker log `storage request rejected: STORAGE_VALIDATION_FAILED` (XLSX and PDF of the same data succeed) |
| S3 | `GET /admin/v1/salons/{id}/branches` | `meta` as the contract says (`hasMeta: true`), or the contract without `meta` | `data` only, no `meta` (admin now tolerates both) |
| S4 | demo seed staff photos, e.g. `http://127.0.0.1:9000/app-public/demo/members/joury-staff0.jpg` (booking `photoUrl`) | image | `404 application/xml` (object never uploaded) |
| S5 | admin `GET /admin/v1/bookings?q=Joury` (a salon name) | PRD A15 lists salon as a filter (served by `salonId`); note only | `q` matches reference (exact) + customer name/phone only; partial references (`BW1JEZ`) do not match |
| S6 | global limit 300 requests/min/IP | — (observation) | a fast sweep with a full reload per page hit 429; normal in-app navigation stays under it, but several admins behind one IP could reach it |

## Blocks / not exercised

- Salon application approve/reject: no pending application on this stack, and `qa/seed.mjs` must not be re-run; needs a new merchant registration (merchant OTP flow) or a fresh stack.
- Staff/admins and roles: nothing to test (no PRD page, no server endpoints); owner decision needed if wanted.
- Reassign save: the server returned no eligible staff for the tested approved booking (both persons).
- Refund: blocked by S1; CSV export blocked by S2.
- Push campaign was composed but not sent (would message real seeded devices).
- WebKit/iPhone/iPad projects not run (no WebKit here); Chrome only.
