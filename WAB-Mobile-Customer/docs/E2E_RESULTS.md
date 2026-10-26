# Customer app — end-to-end pass against a real server (CUS-092, re-run CUS-093)

Run 2026-10-26 on the **local stack** (`WAB-Server`, `OTP_PROVIDER=fake`, `OTP_FIXED_CODE=123456`, demo seed; reseeded mid-run with SRV-160: 12 salons / 21 branches). Android emulator Pixel 8 Pro (API 36, AR + EN, dark + light) with a dev debug build pointed at the stack through untracked local overrides; iOS simulator iPhone 17 (Debug-Dev) smoke path. Payments are paused: only pay on arrival was exercised.

Result keys: **PASS** works as the PRD says · **FIXED** defect found and fixed in this task (unit test named) · **BLOCKED** needs the server or an owner decision (not fixable in the app) · **NOT RUN** not exercised live, reason given.

## Results

| # | Feature (PRD) | Scenario | Result | Fix / note |
|---|---|---|---|---|
| 1 | Onboarding S01 | 4 pages, Next / Skip / Start | PASS | |
| 2 | Nickname & gender S02 | Continue disabled until both set; saved locally | PASS | |
| 3 | Home S03 | Women / Men tabs reload; services "See more" only > 10; recommended; banners | PASS | Images 404 on the local MinIO (seed has no files): placeholders shown (env) |
| 4 | Home S03 nearest | No permission → message + button → explanation → system dialog → "Salon - Branch" cards with km | PASS | Emulator needs a mock location provider |
| 5 | Home S03 | Live unread badge (socket) | FIXED | #17 |
| 6 | Home S03 | AR ↔ EN switch kept the old language's server content until pull-to-refresh | FIXED | `HomeViewModel` reloads on a language change (`HomeViewModelTest.languageSwitchReloadsTheLocalizedContent`) |
| 7 | All salons S04 | Search (debounced), Nearest general filter with distances, service pre-filter from S06 | PASS | |
| 8 | Filter S05 | Services multi-select + "See more", price range after a service, rating, Apply, chips | PASS | |
| 9 | Filter S05 | A chip removed in S04 came back selected when the sheet reopened (and was re-applied) | FIXED | Sheet key reused after close; key now grows per opening (`FilterSheetRequestTest`); re-verified on device |
| 10 | All services S06 | "more" under every one-line description | FIXED | S06 uses `AppExpandableText` (overflow only) (`ExpandToggleTest`) |
| 11 | Salon details S07 | Branch selector (main first), per-branch contacts / hours, staff on duty / leave, services, gallery, share link, sticky Book | PASS | |
| 12 | Salon details S07 | "See more" under every review preview, even one-line, and not clickable | FIXED | `ReviewCardStyle` + `AppExpandableText` (`ReviewCardStyleTest`) |
| 13 | Salon details S07 | Closure read "مغلق 2026-11-14 – 2026-11-14" (raw ISO, same-day range) | FIXED | `closureDatesOf` + `salon_closure_day` (`ClosureDatesTest`) |
| 14 | Staff sheet / service sheet / media viewer S10 | Open, content, "1 / 4" viewer | PASS | |
| 15 | Reviews S08 | Summary, paging, Add review → "will appear after approval" | PASS | |
| 16 | Guest gating | Favorite / Book now → auth dialog → Login | PASS | |
| 17 | Realtime §3.15 | After the 15-minute access token expired the socket got `UNAUTHORIZED` and stayed dead (also raced the HTTP refresh on resume): no live badge / status | FIXED | `SocketIoRealtimeClient` waits for the refreshed stored token and reconnects (`SocketIoRealtimeClientTest.unauthorizedReconnectsOnceTheHttpLayerStoredARefreshedToken`); verified: badge 5→6 on approve, list updated on salon cancel |
| 18 | Login S11 | Invalid number inline error; unregistered → popup → S12 prefilled | PASS | |
| 19 | Register S12 | City → areas, gender prefill, all fields | PASS | |
| 20 | OTP S13 | 6 boxes from `otpLength`, expiry + resend countdowns, wrong code → server attempts-left text, 123456 → signed in | PASS | |
| 21 | OTP S13 | 5 wrong codes → "Too many attempts", code cleared; resend → remaining time | PASS | |
| 22 | OTP S13 | Expired code popup | NOT RUN | 5-minute wait; covered by `OtpViewModelTest` |
| 23 | Booking S16 | Branch preselected, person + bride, services totals, 90-day calendar (Friday off), 15-min slots, staff any / specific, per-slot eligibility (bride → bride-qualified only), companion add / remove, summary, pay on arrival, OTP → S17 | PASS | |
| 24 | Booking S16 | Double tap on "Book now" pushed the flow twice (Back reopened a stale flow) | FIXED | Single-top screen navigation (`ScreenNavigationTest`) |
| 25 | Booking S16 / S15 | Deposit texts showed "30%%" | FIXED | Compose resources print `%%` literally: 4 strings + new policy rule I001 (`test_localization.py`) |
| 26 | Booking S16 | Bride-only (VIP) services offered to non-bride persons | FIXED (CUS-093) | SRV-170 `services[].brideOnly`; S16 offers VIP only to a bride, unmarking the bride drops the pick, VIP rows + S07 list / service sheet / staff sheet say "Brides only" (`BookingFlowBrideOnlyTest`, mapper tests); re-run 2026-10-27: bride sees "Bridal makeup", companion does not |
| 27 | Bookings S14 | Upcoming / Past, statuses, payment chips, search, live updates | PASS | |
| 28 | Bookings S14 | Rejection reason on the card | FIXED (CUS-093) | SRV-170 `rejection` on the row; REJECTED cards show "Reason: …" (`BookingMoneyRowsTest`, `Srv170MappersTest`); re-run: AR + EN, light + dark |
| 29 | Booking details S15 | Status, ref copy, branch, call / WhatsApp, persons, money, policy, cancel deadline | PASS | |
| 30 | Booking details S15 | Every person showed "Staff: Any available" although a staff member was chosen | FIXED (CUS-092 + CUS-093) | SRV-170 `persons[].staff {firstName, photoUrl}`: each person shows the staff first name + photo (initial when no photo); "any" picks show the member the salon assigned (`Srv170MappersTest`) |
| 31 | Booking details S15 | Cancel APPROVED in window → dialog money outcome → CANCELLED_BY_CUSTOMER | PASS | |
| 32 | Booking details S15 | Reason printed the raw code "CUSTOMER_REQUEST" | FIXED | `reasonDisplayOf` + localized lines (`BookingReasonTextTest`) |
| 33 | Booking details S15 | COMPLETED + Paid still shows "Remaining at the salon 94.080" | FIXED (CUS-093) | SRV-170: `remaining` 0 once final, new "Paid at the salon" row for COMPLETED, "Paid" renamed "Paid online" (`BookingMoneyRowsTest`); re-run: completed 8.000 → paid at salon 8.000, remaining 0; cancelled → remaining 0 |
| 34 | Rating S18 | Salon step → submitted, approval message | PASS | |
| 35 | Rating S18 | No staff step | FIXED (CUS-093) | "Step 2 of 2 · Rate who served you" with the member photo; staff review posted (`POST /salons/{id}/staff/{memberId}/reviews` → approval message) (`RatingStepsTest`) |
| 36 | Notifications S19 | List, relative time, read on view (badge cleared), popup → View booking, filter search chip | PASS | |
| 37 | Counted texts | Arabic "قبل 3 دقيقة", "5 تقييم", "12 ساعات"; English "1 hours ago" | FIXED | 8 strings are plurals (Arabic one/two/few/many/other) |
| 38 | Favorites S20 | Heart on a card → tab list; guest message | PASS | |
| 39 | Profile S21 | Language AR / EN, theme, push toggle (PATCH), Contact / FAQ / legal, logout, delete account (grace) → login restores | PASS | |
| 40 | Edit info S22 | Name + phone change → OTP to the new number → saved | PASS | |
| 41 | Force update / maintenance S24 | Gates | NOT RUN | Would change the shared local stack's global settings used by other agents; covered by `launchGateOf` / `MainViewModel` tests |
| 42 | iOS smoke | Launch → S02 → Home (RTL, server data over http to 127.0.0.1) → S07 → Book → Login → OTP | PASS | |
| 43 | iOS sign-in | After a correct code the sign-in failed silently (code cleared) | FIXED | Without a Firebase app-instance id login sent `installation {installationId:"unknown", platform:"unknown"}` → 422 `VALIDATION_ERROR`; now a persisted local UUID + the real platform (`AppInstallationInfoProviderTest`) |

**Counts (CUS-092):** 43 rows · PASS 24 · FIXED 13 · BLOCKED 4 · NOT RUN 2. **After CUS-093:** the 4 BLOCKED rows (#26, #28, #33, #35) and the server half of #30 are FIXED.

## Re-run after SRV-170 (CUS-093, 2026-10-27)

Local stack with SRV-170 (`openapi.customer.json` 1.5.0), Android emulator Pixel 4 AVD (API 36, own instance; the larger AVDs were in use by other agents), dev debug build with the untracked local overrides below. Customers +962799000007 (men's bookings), +962799000014 (women's: Rose Bridal Studio).

| # | Feature (PRD) | Scenario | Result | Fix / note |
|---|---|---|---|---|
| 44 | Guest S01/S02/S03 | Onboarding skip, nickname + gender, Home with server data | PASS | |
| 45 | Login S11 / OTP S13 | Phone → WhatsApp OTP (fixed code) → signed in | PASS | The code boxes get focus but the keyboard opens only after a tap (observation) |
| 46 | Salon cards S03/S04/S20, branch step S16 | Before opening (1 AM) every salon read "Closed today" although it opens at 11:00 today | FIXED | `hoursLine` / favorites: "Closed · 11:00 AM – 9:00 PM" outside today's hours, "Closed today" only without hours today (`DomainCardsTest`, `FavoriteStatusTest`) |
| 47 | Booking S16 | Android system Back on any step left the whole flow (selections lost); PRD: Back returns to the previous step | FIXED | `AppBackHandler` (design system, `navigationevent-compose`) routes system Back to `OnBack`; re-run: services → person, person → branch, branch → salon details |
| 48 | Booking S16 | Bride + companion, bridal makeup for the bride only, specific + any staff, summary, pay on arrival, OTP → S17 | PASS | WAB-SKFH82 |
| 49 | Booking details S15 | Staff per person, cancel in window → reason card, remaining 0 | PASS | |
| 50 | Salon details S07 / staff sheet | "Brides only" on the VIP service row and in the staff's service chips | PASS | |
| 51 | Bookings S14 | Past list: REJECTED card with the reason, COMPLETED / CANCELLED | PASS | AR + EN, light + dark |
| 52 | Rating S18 | Salon step then staff step (photo), submitted | PASS | |
| 53 | Favorites S20 / Notifications S19 / Profile S21 / Edit info S22 | Lists, language AR → EN | PASS | |
| 54 | Theme S21 | Tapping "Dark" in the theme sheet raised "App isn't responding" twice | NOT RUN (env) | The 2 GB Pixel 4 AVD was swapping (80 MB free, 1.27 GB swap); the app main thread was idle in the Looper (SIGQUIT trace), so the stall is the device, not the app; dark checked through the system night mode instead (PASS). Re-check on a healthy device |

**Re-run counts:** 11 rows · PASS 8 · FIXED 2 (#46, #47) · NOT RUN 1 (#54, environment).

### Hosted Render dev API (public reads only, no credentials)
`GET /customer/v1/salons/{id}` on `wab-server-dev.onrender.com` still has no `services[].brideOnly` (old server). The 1.5.0 client requires it, so against Render salon details, the staff sheet and the booking flow show the error state until Render runs SRV-170 (sign-in there already fails: `otp/verify` 404). Deploy SRV-170 to Render before shipping a dev build that points at it.

## Server follow-ups (not fixable in the app)
1–4 (bride-only flag, staff per person, list rejection, remaining after completion): done by SRV-170, adopted by CUS-093.
5. Render dev API runs a pre-SRV-170 server (no `brideOnly`, no `otp/verify`): redeploy (owner, SRV-152/154).
6. Cosmetic (server text): the cancellation notification names the branch for non-main branches ("Rose Bridal Studio - Al-Rabyeh") but not for the main one; salon-written rejection reasons come back in the language they were written in (seed: English inside the Arabic UI).

## Observations (cosmetic, not changed)
- S14 card: a Latin rejection reason inside the Arabic "السبب: …" line is bidi-reordered (trailing period shown first).
- S13: the first code box is focused but the keyboard opens only after tapping it.
- Home nearest: permission granted but no location fix within the timeout shows "Enable location" again.
- iOS: the Arabic phone placeholder is bidi-reordered inside the LTR number field.
- Demo images and flags are missing on the local MinIO (404): placeholders everywhere (environment).

## How the run was set up (local only, nothing committed)
- Android: `local.properties` → `DEV_API_BASE_URL=http://10.0.2.2:4000`; untracked `androidApp/src/devDebug/AndroidManifest.xml` allowing cleartext; `adb reverse tcp:9000 tcp:9000` for MinIO; location via `cmd location providers add-test-provider/set-test-provider-location` (fused + gps + network).
- iOS: git-ignored `iosApp/Configuration/Local.xcconfig` → `API_BASE_URL = http:/$()/127.0.0.1:4000`.
- Salon side actions (approve / reject / cancel) through the merchant API as the Lamar demo owner.
