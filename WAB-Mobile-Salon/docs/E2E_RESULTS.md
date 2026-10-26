# Merchant app — end-to-end results (MER-075, 2026-10-27)

Local QA stack (server incl. SRV-170, contract 1.6.0, fake OTP 123456), seeded demo salons (`WAB-Server/docs/DEMO_ACCOUNTS.md`).
Android: emulator Pixel 10 Pro XL (API 36, 448 dp wide, `emulator-5570`), dev debug build with a local-only
`DEV_API_BASE_URL=http://10.0.2.2:4000`, `DEV_DATA_SOURCE=remote` and a temporary cleartext flag (not committed).
iOS: iPhone 17 simulator, `iosApp-Dev` Debug-Dev with a git-ignored `Local.xcconfig` (`API_BASE_URL` = local stack),
simulator-signed build (`CODE_SIGN_IDENTITY=-`). Bookings were created as seeded customers through the customer API
(`otp/request` → `verify` → draft → `verify-otp` → `POST /bookings`), and acted on by other members through the merchant API.

## Results

| Area | Role | Platform | Result | Notes |
|---|---|---|---|---|
| Login / WhatsApp OTP | owner, Khalda manager, Khalda employee, Rose owner | Android | ✔ | after a fresh `pm clear` each time |
| Login / WhatsApp OTP | Rose owner | iOS | ✔ after fix | was VALIDATION_ERROR (installation "unknown", fixed) |
| Home dashboard (pending card, today, timeline, KPIs) | owner, manager | Android + iOS | ✔ | employee has no Home (no `DASHBOARD_VIEW`) ✔ |
| Real-time request (socket) | owner | Android | ✔ | customer booking appeared on Home and in the queue within a second |
| Request handled elsewhere (socket `booking.updated`) | owner + manager | Android | ✔ | queue and pending count drop the request; details refresh to Approved |
| M10 sheet: accept, reject (code / OTHER + text), next, done, view booking, view details | owner | Android + iOS | ✔ after fix | View booking / View details were covered by the next request (fixed) |
| Bookings list: tabs, branch chips, search (full reference), filter | owner, manager, employee | Android + iOS | ✔ | manager/employee: no branch chips, own branch / own bookings |
| Booking details (contract 1.6.0): staff photo/letter per person, Paid at the salon, Remaining 0 when final, Refunded only when non-zero | owner | Android + iOS | ✔ | COMPLETED WAB-DQ6M9F: paid at salon 162 JOD, remaining 0 |
| Reject / cancel reason texts | owner | Android | ✔ after fix | raw `FULLY_BOOKED` shown in Arabic (fixed) |
| Complete & paid, cancel (full refund dialog) | owner | Android | ✔ | |
| Reassign | owner | Android | ✔ after fix | listed a non-qualified member the server refused (fixed: server eligible list) |
| ALREADY_HANDLED (422) | — | — | not reached on device | the socket refresh always arrived first; unit tests cover the 422 path |
| Calendar day / week, branch chips | owner | Android | ✔ after fix | Gardens staff missing (team list page 1 only, fixed); 11 columns are very narrow in "all branches" (design gap, see below) |
| Salon hub: profile, gallery, hours, services, team, branches, policies, reviews, statistics, finance | owner | Android | ✔ | read and navigate; no edits saved |
| Permissions: hidden not disabled | manager / employee | Android | ✔ | manager: no Branches / Policies / Finance tiles; employee: Bookings, Calendar, Salon (Reviews only), More |
| More / my account, language AR ↔ EN, dark mode | owner | Android | ✔ | EN LTR + dark checked on Home and details |
| Landscape | owner | Android | ✔ after fix | rail navigation; rotating on details went back to Home (fixed) |
| Notifications inbox, statistics, finance, bank details | owner | Android | partial | opened (statistics, finance); inbox and bank-details save not exercised this pass (MER-073 covered bank details) |
| Avatars / images | all | Android + iOS | ✔ after fix | failed photos now show letters; local MinIO images are unreachable from the emulator (127.0.0.1) |

## App defects found and fixed (each with unit tests)

1. **Request sheet covered the chosen screen** — after Accept → *View booking* or *View details* the next queued request opened over the booking. Done / View booking / View details now close the sheet; the queue returns with a new request or the next app start (`BookingRequestsViewModel`).
2. **Raw reason codes in Arabic** — a rejection without typed text showed `FULLY_BOOKED` in the reason line and status history; picker codes now show their AR/EN label.
3. **Customer phone `962799000024+`** — LTR isolate for phones (shared `ltrIsolate`).
4. **Request/pending lines scrambled in Arabic** — "Dana Majali · 11:30 ص – 12:15 م" rendered LTR with the times out of order; `meta_pair` parts are first-strong isolates (`metaPair`).
5. **Reassign offered refused staff** — the sheet listed the branch team; now `GET /bookings/{id}/eligible-staff` per person with loading / empty / failure texts.
6. **Team page 1 only** — bookings read `GET /team/members` without paging (server default 10): the 11th and 12th providers were missing from filter and calendar.
7. **Broken-image icon in avatars** — avatars fall back to letters when the photo fails.
8. **Rotation lost navigation** — rotating on booking details returned to Home (session read as guest for one frame after recreation); the session is a `StateFlow` held by `MainViewModel`.
9. **iOS sign-in VALIDATION_ERROR without Firebase** — installation "unknown" broke the contract; the device's own stored id and the real platform are sent.
10. **Country flags never drawn** — flags are `.svg`; the image loader now has the Coil SVG decoder (not verifiable on the local stack, see server issue 1).

## Server / environment findings (server not changed)

| # | Endpoint / area | Request | Expected | Actual |
|---|---|---|---|---|
| 1 | `GET /merchant/v1/locations/countries` → `flagUrl` | `http://127.0.0.1:9000/wab-public/flags/jo.svg` (local MinIO) | 200 image | 404 (object not seeded on the local stack) |
| 2 | `GET /customer/v1/salons/{salonId}?branchId=<Abdoun>` | branch filter | services of that branch only | services of every branch (first item was a Gardens service); booking it at Abdoun answers 400 `VALIDATION_ERROR` on `availability` |
| 3 | `GET /merchant/v1/bookings?q=46512N` | part of a reference | the booking (PRD M08 "search by reference") | empty; only the full `WAB-46512N` matches |
| 4 | Local media | `http://127.0.0.1:9000/...` image URLs | reachable from devices | not reachable from the Android emulator (127.0.0.1 = the emulator); dev/prod CDN not affected |

## Design gaps / owner questions (not changed)

- Calendar day view with **All branches** on a phone: 11 staff columns of ~30 dp, blocks show only "…". The design (`04 Calendar`, `flex:1;min-width:0`) has no minimum column width or horizontal scroll; choose a branch or staff filter today.
- Long auto-cancel countdowns read "184h 29m"; the design only shows short ones (days not defined).
- `rejection` on list rows is decoded but not drawn: neither PRD M08 nor design 03 shows a reason on the list card.

## Blocks

- MER-004 (owner Firebase iOS/Android registrations): push/FCM delivery and the iOS time-sensitive request notification were not tested; the iOS simulator run had no Firebase plist.
- `ALREADY_HANDLED` 422 on device: not reproducible while the socket is live (covered by unit tests).
- Render dev still runs an old server: nothing signed-in was sent there.
