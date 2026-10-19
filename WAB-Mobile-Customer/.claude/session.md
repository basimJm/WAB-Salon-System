# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Batch 1 (CUS-032…036) shipped (PR #277). Batch 2 (CUS-037…041) shipped as one PR from `feat/cus-041-bookings-tab`. Owner rule (revised 2026-10-19): every five tasks unit tests only + one PR; detekt, full gate, emulator + simulator journey once after the whole backlog. Batch 3 (CUS-042…046) shipped (PR #287). Batch 4 = CUS-048, 049, 050, 053, 057 → unit-test run green → PR.

### CUS-042 — Booking details S15: `GET /bookings/{id}`, cancel rules + `POST /bookings/{id}/cancel` with money-outcome confirmation, Rate when COMPLETED, realtime
- Branch: `feat/cus-042-booking-details` (from `origin/customer`, batch 3 start)
- Status: IN REVIEW (batch 3)
- Acceptance criteria (PRD S15, Design Script S15, BUSINESS_DOMAIN §5.7/§5.8; operations `GET /bookings/{id}`, `POST /bookings/{id}/cancel`; realtime `booking.updated`):
  - [x] core/domain `booking/BookingDetails.kt` (`RefundStatus`, `FullPaymentRefundRule`, `BookingPolicy` snapshot, persons, money, reasons); data mapper parses the untyped `policy` object leniently (null → block hidden)
  - [x] Pure rules (`CancellationRules.kt`, tested): PENDING → any time; APPROVED → until `appointmentStart − cancellationWindowHours` else window passed; others → not applicable. Refund outcome: PENDING → full refund (or nothing paid); DEPOSIT → full if `depositRefundableOnCustomerCancel` else deposit kept; FULL_ONLINE → full or deposit deducted (`MINUS_DEPOSIT` with a deposit %); PAY_ON_ARRIVAL → nothing
  - [x] `BookingDetailsViewModel(bookingId)`: booking + salon contact (`SalonDetailsRepository`: phone / WhatsApp / image, since the booking carries only the salon id), cancel dialog with the money outcome → `POST cancel` → toast + reload, Rate only when COMPLETED → `Screen.RateBooking` (placeholder, CUS-049), instant reload on `booking.updated`; `BookingDetailsScreen` (status / payment / refund badges, reference with Copy, rejection / cancellation reason, salon block + Call / WhatsApp via the external port, persons with bride badge / services + prices / staff / date-time, payment breakdown incl. refunded, policy snapshot, sticky Cancel bar with the fixed rule message, disabled when the window passed); registered in `BookingsNavigation`; AR + EN strings
  - [x] Tests: `CancellationRulesTest` (2), `BookingDetailsViewModelTest` (4)
  - [ ] Unit-test run: batch 3
- Loops: 1/1 — batch-3 host-test run (41 tests, 7 modules, exit 0) found: the calendar helpers dropped when the flow view model was split (restored as `CalendarCoordinator`), `AppDestructiveButton` has no `loading` parameter (now `AppButton(kind = Destructive)`), a redundant `else` in `DayOfWeek.toSalonDay()` (-Werror), deprecated `LocalClipboardManager` (suppressed with reason), duplicate private fakes/helpers across the bookings test files, and the flow test file over 300 lines (split into fakes + harness + two classes).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — flow and details talk to the contract via `CustomerOperations`/`pathWith`; rules §4 (max 5 companions, 15-min slots, 90 days, staff must cover all services, no overlap for a specific staff, PENDING cancel any time, policy snapshot drives the money outcome) live in the domain with tests; draft payment fallback keyed on `ErrorCode.PAYMENT_OPTION_NOT_ALLOWED`; AR+EN parity; no literals in composables; policy suite ok. NON-BLOCKING: salon details carry no payment options/policy (draft fallback); services lack `brideOnly`; `actions` is the merchant view.
- Notes: `actions` in the contract is the merchant view, so the customer rule is computed locally from the policy snapshot; no partial cancel / reschedule by design.

### CUS-043 — Booking flow S16 steps 0–1: person setup (bride toggle), services multi-select with totals, draft `POST/GET/DELETE /bookings/drafts`
- Branch: `feat/cus-043-booking-persons-services` (from `feat/cus-042-booking-details`)
- Status: IN REVIEW (batch 3)
- Acceptance criteria (PRD S16 steps 0–1, Design Script S16; operations `POST /bookings/drafts` (name 1–50, serviceIds 1–20, start required per person), `GET/DELETE /bookings/drafts/{id}`):
  - [x] `feature/booking` domain: `DraftPerson` (name, bride, services, date, start, staff choice), `BookingDraft` + `DraftPolicy` / money / persons results, `BookingFlowDefaults` (5 companions, 90 days, 15-min slots, name ≤ 50), money in fils (`jodToFils` / `filsToJod`, `selectionTotalsOf`, tested), `BookingDraftRepository` + use cases; data `BookingDraftApi` + mappers + impl + di
  - [x] `BookingFlowViewModel(salonId)` owns the whole draft (Back keeps selections): loads the salon (gender, services) and prefills the main person with the account first name; step 0 name required (error on continue), bride toggle only for women's salons; step 1 multi-select per person with running total price (fils) + duration, Continue enabled when ≥ 1; `AppStepIndicator` on every step; `BookingFlowScreen` + `ServicesStep`; `BookingNavigation` replaces the `Screen.BookingStart` placeholder; AR + EN strings
  - [x] Tests: `SelectionTotalsTest` (1), `BookingFlowViewModelTest` (3)
  - [ ] Unit-test run: batch 3
- Loops: 1/1 — batch-3 host-test run (41 tests, 7 modules, exit 0) found: the calendar helpers dropped when the flow view model was split (restored as `CalendarCoordinator`), `AppDestructiveButton` has no `loading` parameter (now `AppButton(kind = Destructive)`), a redundant `else` in `DayOfWeek.toSalonDay()` (-Werror), deprecated `LocalClipboardManager` (suppressed with reason), duplicate private fakes/helpers across the bookings test files, and the flow test file over 300 lines (split into fakes + harness + two classes).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — flow and details talk to the contract via `CustomerOperations`/`pathWith`; rules §4 (max 5 companions, 15-min slots, 90 days, staff must cover all services, no overlap for a specific staff, PENDING cancel any time, policy snapshot drives the money outcome) live in the domain with tests; draft payment fallback keyed on `ErrorCode.PAYMENT_OPTION_NOT_ALLOWED`; AR+EN parity; no literals in composables; policy suite ok. NON-BLOCKING: salon details carry no payment options/policy (draft fallback); services lack `brideOnly`; `actions` is the merchant view.
- Notes: CONTRACT GAP — the salon's services carry no `brideOnly` flag, so bride-only visibility (PRD step 1) cannot be applied on the client; the server rejects with `BRIDE_ONLY_SERVICE` at draft time (flagged for SRV). The server draft is created at the summary step (it needs `start` per person and holds slots for 10 min).

### CUS-044 — Booking flow step 2: calendar 90 days (closed days disabled), `POST /salons/{id}/availability` slots at 15 min, "Full" slots, per-person occupancy
- Branch: `feat/cus-044-booking-slots` (from `feat/cus-043-booking-persons-services`)
- Status: IN REVIEW (batch 3)
- Acceptance criteria (PRD S16 step 2, Design Script S16, BUSINESS_DOMAIN §5.4; operation `POST /salons/{salonId}/availability` (date, person, others, draftId)):
  - [x] Domain: `AvailabilitySlot` / `DayAvailability` / `NoSlotsReason`, `calendarDaysOf(today, 90, weeklySchedule, closures)` (weekly days off + exceptional closures disabled; tested), `AvailabilityRepository` + `LoadAvailabilityUseCase` (sends the earlier persons with a specific staff + start as `others`); data `AvailabilityApi` + body builder + mapper
  - [x] View model: entering the step builds the calendar from the business-zone today; date select → slots request (resets slot + staff); "Full" slots cannot be selected; Continue only with a slot; Back keeps the date, slot and slots (no re-request)
  - [x] `SlotStep`: month calendar (Saturday-first week, prev / next month, disabled days greyed), 15-minute slots as `AppTimeSlotChip` (available / selected / Full) in Amman 12-hour time, "no available times" message, shimmer, error with retry; AR + EN strings
  - [x] Tests: `CalendarDaysTest` (1), `BookingFlowViewModelTest` (+1)
  - [ ] Unit-test run: batch 3
- Loops: 1/1 — batch-3 host-test run (41 tests, 7 modules, exit 0) found: the calendar helpers dropped when the flow view model was split (restored as `CalendarCoordinator`), `AppDestructiveButton` has no `loading` parameter (now `AppButton(kind = Destructive)`), a redundant `else` in `DayOfWeek.toSalonDay()` (-Werror), deprecated `LocalClipboardManager` (suppressed with reason), duplicate private fakes/helpers across the bookings test files, and the flow test file over 300 lines (split into fakes + harness + two classes).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — flow and details talk to the contract via `CustomerOperations`/`pathWith`; rules §4 (max 5 companions, 15-min slots, 90 days, staff must cover all services, no overlap for a specific staff, PENDING cancel any time, policy snapshot drives the money outcome) live in the domain with tests; draft payment fallback keyed on `ErrorCode.PAYMENT_OPTION_NOT_ALLOWED`; AR+EN parity; no literals in composables; policy suite ok. NON-BLOCKING: salon details carry no payment options/policy (draft fallback); services lack `brideOnly`; `actions` is the merchant view.
- Notes: the server returns `eligibleStaffIds` per slot; step 3 (CUS-045) uses them to enable / disable staff.

### CUS-045 — Booking flow steps 3–4: staff selection (eligible vs disabled, "Any available"), companions up to 5, repeat per companion, overlap rule, remove persons
- Branch: `feat/cus-045-booking-staff-companions` (from `feat/cus-044-booking-slots`)
- Status: IN REVIEW (batch 3)
- Acceptance criteria (PRD S16 steps 3–4, Design Script S16):
  - [x] Step 3: all salon staff listed; only the chosen slot's `eligibleStaffIds` selectable (others disabled with a hint); "Any available staff" on top; `hasStaffOverlap` (pure, tested) blocks the same staff member at an overlapping time inside the draft with a message
  - [x] Step 4: "Continue (just me)" → summary; "Add companion" (≤ 5, counter, limit message) appends a person and repeats steps 0–3 for it (the availability request carries the earlier persons' picks as `others`); the companion's Back on step 0 drops an unfinished companion; persons list with bride badge and remove (main cannot be removed); Back from the list returns to the main person's staff step
  - [x] `StaffStep`, `CompanionsStep`; AR + EN strings
  - [x] Tests: `StaffRulesTest` (1), `BookingFlowViewModelTest` (+3)
  - [ ] Unit-test run: batch 3
- Loops: 1/1 — batch-3 host-test run (41 tests, 7 modules, exit 0) found: the calendar helpers dropped when the flow view model was split (restored as `CalendarCoordinator`), `AppDestructiveButton` has no `loading` parameter (now `AppButton(kind = Destructive)`), a redundant `else` in `DayOfWeek.toSalonDay()` (-Werror), deprecated `LocalClipboardManager` (suppressed with reason), duplicate private fakes/helpers across the bookings test files, and the flow test file over 300 lines (split into fakes + harness + two classes).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — flow and details talk to the contract via `CustomerOperations`/`pathWith`; rules §4 (max 5 companions, 15-min slots, 90 days, staff must cover all services, no overlap for a specific staff, PENDING cancel any time, policy snapshot drives the money outcome) live in the domain with tests; draft payment fallback keyed on `ErrorCode.PAYMENT_OPTION_NOT_ALLOWED`; AR+EN parity; no literals in composables; policy suite ok. NON-BLOCKING: salon details carry no payment options/policy (draft fallback); services lack `brideOnly`; `actions` is the merchant view.
- Notes: companions are the salon's gender by construction (the flow is per salon); the server re-validates overlaps and eligibility at draft time.

### CUS-046 — Booking flow step 5: summary per person, grand total, salon rules, payment method with deposit amount
- Branch: `feat/cus-046-booking-summary` (from `feat/cus-045-booking-staff-companions`)
- Status: IN REVIEW (batch 3)
- Acceptance criteria (PRD S16 step 5, Design Script S16; operations `POST /bookings/drafts` (price + policy snapshot, holds 10 min), `DELETE /bookings/drafts/{id}`):
  - [x] Entering the summary creates the server draft (`DraftCoordinator`): preferred method order pay-on-arrival → deposit → full; `PAYMENT_OPTION_NOT_ALLOWED` falls back to the next option (the salon's options are only known from the draft — contract gap flagged: salon details carry no policy); other errors (e.g. `SLOT_TAKEN`) show the error with Back
  - [x] `SummaryStep`: per-person blocks (name, bride badge, services + prices, staff / any, date-time), grand total, salon rules (window, deposit %, refund rule, approval note, notes), payment selector limited to the policy's options with the deposit amount / full amount; selecting another method deletes and re-creates the draft (server recomputes money); Confirm → `Screen.BookingVerify(draftId)` (placeholder, CUS-047); Back releases the draft (holds) and returns to companions
  - [x] AR + EN strings
  - [x] Tests: `BookingFlowViewModelTest` (+1: fallback order, switching, confirm, release)
  - [ ] Unit-test run: batch 3
- Loops: 1/1 — batch-3 host-test run (41 tests, 7 modules, exit 0) found: the calendar helpers dropped when the flow view model was split (restored as `CalendarCoordinator`), `AppDestructiveButton` has no `loading` parameter (now `AppButton(kind = Destructive)`), a redundant `else` in `DayOfWeek.toSalonDay()` (-Werror), deprecated `LocalClipboardManager` (suppressed with reason), duplicate private fakes/helpers across the bookings test files, and the flow test file over 300 lines (split into fakes + harness + two classes).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — flow and details talk to the contract via `CustomerOperations`/`pathWith`; rules §4 (max 5 companions, 15-min slots, 90 days, staff must cover all services, no overlap for a specific staff, PENDING cancel any time, policy snapshot drives the money outcome) live in the domain with tests; draft payment fallback keyed on `ErrorCode.PAYMENT_OPTION_NOT_ALLOWED`; AR+EN parity; no literals in composables; policy suite ok. NON-BLOCKING: salon details carry no payment options/policy (draft fallback); services lack `brideOnly`; `actions` is the merchant view.

### CUS-048 — Booking success S17: reference number (copyable), View booking → S15, Back to Home
- Branch: `feat/cus-048-booking-success`
- Status: IN REVIEW (batch 4)
- Acceptance criteria (PRD S17; Design Script S17; no API operation):
  - [x] `Screen.BookingSuccess(bookingId, referenceNumber)` route; success icon + message, reference card with Copy (clipboard + success toast), View booking → `Screen.BookingDetails` replacing S17, Back to Home clears to `Graph.Home`
  - [x] No "add to calendar" (PRD); AR/EN strings; analytics screen + three actions
  - [x] Unit test: state from the route, copy / view / home side effects and action names
- Tests: `BookingSuccessViewModelTest` (2) — run with the batch-4 host-test run
- Loops: 1/1 — batch-4 host-test run (94 tests across core/common, booking, bookings, notifications, profile, salon, composeApp + `:androidApp:compileDevDebugKotlin`, exit 0) found: the profile domain test module lacked coroutines-test, the permissions fake missed two members, a smart-cast on `NotificationFilters.from/to` across modules, the notifications API test client sent no JSON content type, the salon share test still expected `/salons/`, and the mark-read retry: a failed `POST /notifications/read` left the row styled read so it was never retried (now reverted on failure).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — every screen goes through `CustomerOperations`; new features follow domain ← data / presentation + di; no literals in composables, AR/EN parity in all five resource sets; uploads follow PRD §3.16 (presign → bare storage client → confirm → avatar); deep links keep the host in config (`<ENV>_WEB_BASE_URL`, `DEEP_LINK_HOST`) and route only after onboarding / S02; delete account → guest per PRD S21. NON-BLOCKING: merchant registration link path is a constant (no server field); date range typed as ISO text (no picker component yet); iOS picker / entitlement compile only at the final gate.
- Notes: nothing navigates into S17 yet: CUS-047 (verification + payment, BLOCKED on PAY-011) is the producer of the booking id + reference. Clipboard uses the deprecated `LocalClipboardManager` (suppressed with reason, same as S15).

### CUS-049 — Rating flow S18: salon step + one step per staff member who served, skip per step, pending-approval message
- Branch: `feat/cus-049-rating-flow`
- Status: IN REVIEW (batch 4)
- Acceptance criteria (PRD S18; Design Script S18; operations `POST /salons/{id}/reviews`, `POST /salons/{id}/staff/{memberId}/reviews` via `ReviewsRepository`):
  - [x] `BookingPerson.staffId` added (mapper from `persons[].staff.id`); `ratingStepsOf(booking)` = salon then distinct staff with ids (any-staff persons skipped; deleted salon → no steps)
  - [x] `RatingViewModel`: load booking → steps; rating 1–5 + comment ≤ 1000 per step; Submit (trimmed comment, empty → null) or Skip advances; last step → finished with the approval message ("nothing to rate" when nothing was submitted); submit failure keeps the step + error toast
  - [x] `RatingScreen` (step indicator, card per step, Skip, done state) registered for `Screen.RateBooking` in `BookingsNavigation` (placeholder removed); entry from S15 Rate already wired (CUS-042); AR/EN; analytics screen + submit/skip actions
  - [x] Unit tests: `RatingStepsTest` (2), `RatingViewModelTest` (3)
- Tests: run with the batch-4 host-test run
- Loops: 1/1 — batch-4 host-test run (94 tests across core/common, booking, bookings, notifications, profile, salon, composeApp + `:androidApp:compileDevDebugKotlin`, exit 0) found: the profile domain test module lacked coroutines-test, the permissions fake missed two members, a smart-cast on `NotificationFilters.from/to` across modules, the notifications API test client sent no JSON content type, the salon share test still expected `/salons/`, and the mark-read retry: a failed `POST /notifications/read` left the row styled read so it was never retried (now reverted on failure).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — every screen goes through `CustomerOperations`; new features follow domain ← data / presentation + di; no literals in composables, AR/EN parity in all five resource sets; uploads follow PRD §3.16 (presign → bare storage client → confirm → avatar); deep links keep the host in config (`<ENV>_WEB_BASE_URL`, `DEEP_LINK_HOST`) and route only after onboarding / S02; delete account → guest per PRD S21. NON-BLOCKING: merchant registration link path is a constant (no server field); date range typed as ISO text (no picker component yet); iOS picker / entitlement compile only at the final gate.
- Notes: entry from the "booking completed" notification lands in CUS-050/051 (notifications + deep links). `ReviewsRepository` lives in `feature/salon/domain` (already a dependency of `feature/bookings/presentation`).

### CUS-050 — Notifications S19: list + filters, unread count, visible items reported read, popup with View booking
- Branch: `feat/cus-050-notifications`
- Status: IN REVIEW (batch 4)
- Acceptance criteria (PRD S19, Design Script S19; operations `GET /notifications?page&pageSize&from&to&q`, `GET /notifications/unread-count`, `POST /notifications/read`):
  - [x] New `feature/notifications` (domain `Notification`/`NotificationFilters`/`NotificationDefaults`, `relativeTimeOf` buckets in Asia/Amman (tested), repository + 3 use cases (`MarkNotificationsReadUseCase` drops read ids); data `NotificationsApi` (only active filters sent, tested) + impl + mapper; di) wired in settings/plugin/App/MainNavigation
  - [x] `NotificationsViewModel`: paged list (10), pull-to-refresh (keeps content on failure + toast), filter sheet (ISO date range validated `from ≤ to`, search ≤ 60 trimmed) → removable chips (dates / text), visible ids reported read once in the background (optimistic read styling; failed report retried on the next visibility), tap → popup marks read; booking notifications offer View booking → `Screen.BookingDetails`
  - [x] `NotificationsScreen` (top bar Filter action, chips, shimmer / empty "No notifications" / error / offline, `AppPagedList` with a `snapshotFlow` on visible keys), `NotificationRow` (unread bold + badge, relative time: now / minutes / hours / yesterday / days / date), `NotificationsFilterSheet`, popup `AppDialog`; placeholder removed; AR/EN; analytics
  - [x] Unit tests: `RelativeTimeTest` (2), `NotificationsApiTest` (3), `NotificationsViewModelTest` (5)
- Tests: run with the batch-4 host-test run
- Loops: 1/1 — batch-4 host-test run (94 tests across core/common, booking, bookings, notifications, profile, salon, composeApp + `:androidApp:compileDevDebugKotlin`, exit 0) found: the profile domain test module lacked coroutines-test, the permissions fake missed two members, a smart-cast on `NotificationFilters.from/to` across modules, the notifications API test client sent no JSON content type, the salon share test still expected `/salons/`, and the mark-read retry: a failed `POST /notifications/read` left the row styled read so it was never retried (now reverted on failure).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — every screen goes through `CustomerOperations`; new features follow domain ← data / presentation + di; no literals in composables, AR/EN parity in all five resource sets; uploads follow PRD §3.16 (presign → bare storage client → confirm → avatar); deep links keep the host in config (`<ENV>_WEB_BASE_URL`, `DEEP_LINK_HOST`) and route only after onboarding / S02; delete account → guest per PRD S21. NON-BLOCKING: merchant registration link path is a constant (no server field); date range typed as ISO text (no picker component yet); iOS picker / entitlement compile only at the final gate.
- Notes: dates are typed as ISO text in the sheet (the design system has no date picker yet; a picker component can replace the two fields without touching the view model). The unread badge on Home keeps using the realtime `notifications.unread` event (CUS-032); S18 for completed bookings from the popup goes through S15's Rate button. Deep link / push tap handling = CUS-051/052.

### CUS-053 — Profile S21 guest + registered: header, photo upload, settings, support, legal, log in / out, delete account, version
- Branch: `feat/cus-053-profile`
- Status: IN REVIEW (batch 4)
- Acceptance criteria (PRD S21, §3.16, S23 contact; operations `GET /profile`, `PUT/DELETE /profile/avatar`, `DELETE /profile`, `POST /uploads/presign`, `POST /uploads/confirm`; push via `PATCH /installations/push-enabled`, logout via `POST /auth/logout`):
  - [x] core/ui `media/ImagePicker` port (`ImageSource` camera / gallery, `PickedImage` JPEG ≤ 1024 px q85): Android `AndroidImagePickerBridge` (PickVisualMedia + TakePicturePreview, attached in `MainActivity`) + `AndroidImagePicker`; iOS `IosImagePicker` (UIImagePickerController); `FakeImagePicker`. `ExternalActions.openUrl/email` (+ `ExternalLinks.mailto`)
  - [x] New `feature/profile`: domain `CustomerAccount`/`PresignedUpload`/`ProfileDefaults` (30-day grace), `ProfileRepository` + `UploadsRepository`, use cases Load / UploadAvatar (presign → size check `UPLOAD_TOO_LARGE` → direct PUT on a bare storage client → confirm → `PUT /profile/avatar`) / DeleteAvatar / DeleteAccount (signs out on success) / UpdateGuestProfile; data `ProfileApi`, `UploadsApi` (storage client = platform engine without WAB plugins, Koin `named(STORAGE_CLIENT)`), impls + mappers; di
  - [x] `ProfileViewModel` + `AccountCoordinator`: guest header (welcome + Edit sheet nickname/gender, local only) vs registered header (avatar → photo options sheet camera (CAMERA permission via `PermissionFlow`) / gallery / delete, full name, email, shimmer / error + retry); settings (language picker → `AppearanceSettings`, theme picker light/dark/system, push switch → `SetPushEnabledUseCase`); support (Contact Us sheet call / WhatsApp / email from `AppConfig.contact`, FAQ → `Screen.Faq`, Rate → store URL, Share → store URL via share sheet); business → `DeepLinks.merchantRegistration(webBaseUrl)`; legal → `Screen.ContentPage(privacy|terms|about)`; registered: Personal information → `Screen.PersonalInfo`, Log out (global dialog → `LogoutUseCase` → toast), Delete account (global dialog with the 30-day text → `DELETE /profile` → guest + toast); guest: Log in → `Graph.Auth`; app version from `AppEnvironment`
  - [x] `ProfileScreen` (+ `ProfileHeader`, `ProfileRow`/`ProfileSection`, `ProfileOverlays`), `ProfileNavigation` replaces the placeholder `Graph.Profile`; placeholders for S22 / FAQ; AR/EN; analytics; new `AppIcons` (Edit, Delete, Email, Camera, Gallery, Logout, Help, Legal, Business, IdCard)
  - [x] Unit tests: `ProfileUseCasesTest` (3), `ProfileViewModelTest` (5)
- Tests: run with the batch-4 host-test run
- Loops: 1/1 — batch-4 host-test run (94 tests across core/common, booking, bookings, notifications, profile, salon, composeApp + `:androidApp:compileDevDebugKotlin`, exit 0) found: the profile domain test module lacked coroutines-test, the permissions fake missed two members, a smart-cast on `NotificationFilters.from/to` across modules, the notifications API test client sent no JSON content type, the salon share test still expected `/salons/`, and the mark-read retry: a failed `POST /notifications/read` left the row styled read so it was never retried (now reverted on failure).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — every screen goes through `CustomerOperations`; new features follow domain ← data / presentation + di; no literals in composables, AR/EN parity in all five resource sets; uploads follow PRD §3.16 (presign → bare storage client → confirm → avatar); deep links keep the host in config (`<ENV>_WEB_BASE_URL`, `DEEP_LINK_HOST`) and route only after onboarding / S02; delete account → guest per PRD S21. NON-BLOCKING: merchant registration link path is a constant (no server field); date range typed as ISO text (no picker component yet); iOS picker / entitlement compile only at the final gate.
- Notes: "Register your salon" has no server-provided link in the contract (PRD says server-provided page/form link) → website path constant in `DeepLinks`, flagged for the owner / SRV. Upload progress (PRD §3.16) is a busy flag, not a percentage (Ktor upload progress deferred). iOS picker code compiles only at the end-of-backlog gate (no K/N build per task).

### CUS-057 — Deep links: Android App Links + iOS Universal Links for `/salon/{salonId}`, onboarding / S02 first, Home → Salon Details, "Salon not available"
- Branch: `feat/cus-057-deep-links`
- Status: IN REVIEW (batch 4)
- Acceptance criteria (PRD §4.4; domain = owner input, config only):
  - [x] `DeepLinks` (core/common): `salon()` now builds `/salon/{id}` (PRD format; share links updated), `host()`, `parse(url, webBaseUrl?)` (host check, query/fragment ignored, only `/salon/{id}`), `DeepLink.Salon`; tests
  - [x] App shell `DeepLinkStore` (Koin `deepLinkModule`, keeps the last link until consumed) + `DeepLinkEffect` composed only with the NavHost (so onboarding and S02 finish first), then Home tab → `Screen.SalonDetails`; Back returns to Home
  - [x] Android: manifest `autoVerify` intent filter `https://${DEEP_LINK_HOST}/salon/…` (host derived per flavor from `<ENV>_WEB_BASE_URL` in `AndroidAppPlugin`), `MainActivity.onCreate/onNewIntent` publish the URL
  - [x] iOS: `applinks:$(DEEP_LINK_HOST)` entitlement (`DEEP_LINK_HOST` in Dev/Prod xcconfig), `iOSApp.swift` `onOpenURL` + `NSUserActivityTypeBrowsingWeb` → `handleDeepLink` (MainViewController.kt)
  - [x] Missing / hidden salon (`SALON_NOT_FOUND` / `NOT_FOUND`) → `SideEffect.NotAvailable` → back + "Salon not available" toast (AR/EN); test
  - [x] Owner checklist `docs/DEEP_LINKS_CHECKLIST.md` (assetlinks.json, AASA, capability, verification commands)
  - [x] Unit tests: `DeepLinksTest` (2), `DeepLinkStoreTest` (1), `SalonDetailsViewModelTest` (+1)
- Tests: run with the batch-4 host-test run
- Loops: 1/1 — batch-4 host-test run (94 tests across core/common, booking, bookings, notifications, profile, salon, composeApp + `:androidApp:compileDevDebugKotlin`, exit 0) found: the profile domain test module lacked coroutines-test, the permissions fake missed two members, a smart-cast on `NotificationFilters.from/to` across modules, the notifications API test client sent no JSON content type, the salon share test still expected `/salons/`, and the mark-read retry: a failed `POST /notifications/read` left the row styled read so it was never retried (now reverted on failure).
- Review: PASSED (SE ✔, Mobile ✔ (UI check deferred to the end-of-backlog journey per rules §3.13), Architect ✔, QA ✔) — every screen goes through `CustomerOperations`; new features follow domain ← data / presentation + di; no literals in composables, AR/EN parity in all five resource sets; uploads follow PRD §3.16 (presign → bare storage client → confirm → avatar); deep links keep the host in config (`<ENV>_WEB_BASE_URL`, `DEEP_LINK_HOST`) and route only after onboarding / S02; delete account → guest per PRD S21. NON-BLOCKING: merchant registration link path is a constant (no server field); date range typed as ISO text (no picker component yet); iOS picker / entitlement compile only at the final gate.
- Notes: hosts are placeholders until the platform domain is decided (PRD open item 13); App Link verification will fail until the owner publishes the association files. Push-tap routing (notification → booking) is CUS-051/052.

### CUS-051 — Push handling: token registration + refresh, foreground banner + badge refresh, tap → S19 (guest → Home), push toggle synced
- Branch: `feat/cus-051-push` (from `origin/customer`, batch 5 start)
- Status: IN PROGRESS (code + tests written; unit tests at the end of batch 5)
- Acceptance criteria (PRD §10.2; root `CLAUDE.md` §4; server payload keys `event/notificationId/bookingId/salonId/deepLink` + title/body):
  - [x] Token registration + refresh already flow through `PushTokenRelay` → `InstallationSyncer` → `PUT /installations` (CUS-031); unchanged, verified
  - [x] core/notification `push/PushSignals` (`PushKeys`, `pushNotificationOf`, `messages` for foreground pushes, `tap` kept until consumed, `appForeground`)
  - [x] Shell `PushEffect` inside the NavHost: reports foreground state, shows an in-app banner (title + body) for foreground pushes, routes a tapped push: salon `deepLink` → `DeepLinkStore`, registered → Home tab + `Screen.Notifications`, guest → Home (`pushTapDestinationOf`, tested)
  - [x] Android `MyFirebaseMessagingService`: foreground → `PushSignals`, else system notification (channel name AR/EN, big text, tap `PendingIntent` → `MainActivity` extras via `PushIntents`); `MainActivity.onCreate/onNewIntent` publish the tap; `:core:notification` added to the app plugin
  - [x] iOS `AppDelegate`: `willPresent` → `pushReceivedInForeground` (system banner suppressed), `didReceive` → `pushTapped`
  - [x] Home refreshes on a foreground push (badge from the Home payload; test); Profile push toggle asks `NOTIFICATIONS` permission when enabling (test); `push_enabled` synced via `SetPushEnabledUseCase` (CUS-053)
  - [x] Unit tests: `PushRoutingTest` (2), `HomeViewModelTest` (+assert), `ProfileViewModelTest` (+assert)
- Tests: run with the batch-5 host-test run
- Loops: 0/1
- Review: PENDING
- Notes: `PushSignals` is a process-wide object (platform services have no Koin scope guarantee); tests share it (no replay on `messages`). iOS foreground badge count follows the realtime `notifications.unread` event + Home reload. Android notification icon still the launcher foreground mipmap (a dedicated monochrome icon is a design asset for the owner).

### CUS-052 — Realtime wiring: authenticated socket in foreground, events → bookings list / details / unread badge / notifications list; refresh on FCM + foreground; de-duplicate by id
- Branch: `feat/cus-052-realtime-wiring` (from `feat/cus-051-push`)
- Status: IN PROGRESS (code + tests written; unit tests at the end of batch 5)
- Acceptance criteria (PRD §3.15; BUSINESS_DOMAIN §7 `booking.updated` summary, `notifications.unread {count}`):
  - [x] Socket held only while resumed + signed in, reconnect with backoff (CUS-013 `RealtimeConnectionEffect` / `SocketIoRealtimeClient`; unchanged, verified)
  - [x] core/realtime `RealtimeRefresh.kt`: `RefreshReason`, `entityId()` (`id` / `bookingId`), `updateKey()` (name + id + status + updatedAt), `Flow.refreshesFor(name, entityId?)` dropping consecutive duplicates (tests)
  - [x] Bookings list: socket `booking.updated` (de-duplicated) + FCM message → refresh; resume refresh existed
  - [x] Booking details: only this booking's socket updates (de-duplicated) + FCM messages about it → refresh; new `OnResume` (first one skipped) via `LifecycleEventEffect`
  - [x] Notifications list: socket `notifications.unread` + FCM message → refresh (not while the filter sheet is open); new `OnResume`; `RealtimeClient` added to its dependencies/DI
  - [x] Unread badge: Home (`notifications.unread` + push refresh, CUS-032/051)
  - [x] Unit tests: `RealtimeRefreshTest` (2), `BookingDetailsViewModelTest` / `BookingsViewModelTest` / `NotificationsViewModelTest` (+ realtime / push / resume assertions)
- Tests: run with the batch-5 host-test run
- Loops: 0/1
- Review: PENDING
- Notes: de-duplication is per consumer and keyed on the delivered state; the server emits a summary per change so a reconnect replay of the same state does not refresh twice.

### CUS-054 — Edit personal information S22: `PATCH /profile`, phone change → OTP CHANGE_PHONE (`POST /auth/change-phone`), local first name / gender updated
- Branch: `feat/cus-054-edit-profile` (from `feat/cus-052-realtime-wiring`)
- Status: IN PROGRESS (code + tests written; unit tests at the end of batch 5)
- Acceptance criteria (PRD S22 + S12 fields/validation; Design Script S22; operations `PATCH /profile`, `POST /auth/change-phone`):
  - [x] auth: `AuthRepository.changePhone(phone, idToken)` (+ API, impl, `CustomerProfile.toUserProfile`), `ChangePhoneUseCase` updates the session user; profile: `CustomerAccount` gains phone country/number + city/area ids, `ProfileUpdate`, `ProfileRepository.update` (`PATCH /profile`), `UpdateProfileUseCase` refreshes `user_first_name` / `user_gender` locally
  - [x] `EditProfileViewModel`: loads account + countries + cities + the account's areas, prefills all S12 fields (same validation: required, email regex, server phone regex), city change reloads areas; Save: phone unchanged → PATCH → Saved toast + back; phone changed → `Screen.Otp(CHANGE_PHONE, new number)` → proof from `PendingOtpVerification` (other purposes ignored) → change phone → PATCH
  - [x] `EditProfileScreen` (form, "verification code will be sent to the new number" note, Save enabled when valid, country picker) registered for `Screen.PersonalInfo` in `ProfileNavigation` (placeholder removed); AR/EN; analytics
  - [x] Unit tests: `EditProfileViewModelTest` (3); existing `AuthRepository` fakes extended
- Tests: run with the batch-5 host-test run
- Loops: 0/1
- Review: PENDING
- Notes: `POST /auth/check-phone` accepts LOGIN/REGISTER only, so the new number is not pre-checked; the server answers `PHONE_ALREADY_REGISTERED` at change time and the error text is shown. The form composable is a copy of the S12 one (separate feature module); a shared design-system form is a possible later extraction.

### CUS-055 — Legal & support S23: `GET /content/pages/{slug}` rich text (sanitized HTML subset), `GET /content/faqs`, Contact Us from config
- Branch: `feat/cus-055-legal-support` (from `feat/cus-054-edit-profile`)
- Status: IN PROGRESS (code + tests written; unit tests at the end of batch 5)
- Acceptance criteria (PRD S23, §3.11; Design Script S23; operations `GET /content/pages/{slug}`, `GET /content/faqs`):
  - [x] New `feature/content`: domain `ContentPage` / `FaqItem` / `ContentSlugs` (privacy, terms, about, contact), `RichTextParser` (p, br, h1–h6→3, ul/ol/li, b/strong, i/em, a href; unknown tags dropped, entities decoded, whitespace collapsed; tested), repository + use cases (`LoadContentPageUseCase` parses, `LoadFaqsUseCase` de-duplicates); data `ContentApi` (`pathWith` slug) + impl + di
  - [x] `ContentPageViewModel(slug)`: server page → blocks with loading / offline / error / empty; `contact` slug → config contact with Call / WhatsApp / Email through `ExternalActions` (no server call); links open in the browser. `FaqViewModel`: list + independent expand/collapse
  - [x] `ContentPageScreen` (titles per slug, `RichTextBlocks` renderer with theme typography, underlined accent links via `LinkAnnotation`, bullets), `FaqScreen` (cards, animated answers), `ContentNavigation` registers `Screen.ContentPage` + `Screen.Faq` (placeholders removed; S11/S12/S21 links now land here); `AppText(AnnotatedString)` overload; AR/EN; analytics
  - [x] Unit tests: `RichTextParserTest` (2), `ContentApiTest` (1), `ContentViewModelsTest` (3)
- Tests: run with the batch-5 host-test run
- Loops: 0/1
- Review: PENDING
- Notes: the parser is the client-side guard of the "sanitized HTML subset"; scripts / unknown tags never render. Contact details come only from `GET /config` (PRD §3.11).
