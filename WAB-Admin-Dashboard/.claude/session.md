# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 164 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) checked against the real server (local stack + hosted dev wiring): gap list `docs/REMOTE_DEV_GAPS.md`; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

### ADM-112 — Business-made bookings + closing finished bookings in the panel

- Branch: `feat/adm-111-tattoo` (together with ADM-111: the contract re-sync forced both; see Notes)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.20, §5.21; SRV-185, SRV-186; admin contract 1.16.0; operations getBookings, getBookingsById, postExports, getAlerts, getSettings/patchSettings):
  - [x] Bookings list: "Made by" column (Customer app / The business), source filter (URL key `source`, chip, server param), tab "To close" (`TO_CLOSE`)
  - [x] Booking details: customer without an account shown as name + "No WAB account" (no link), "Made by" + "Created by" (member) rows
  - [x] BOOKINGS export sends `source`
  - [x] Alert kind `BOOKING_CLOSE_OVERDUE` (AR + EN label); settings `booking.closeReminderIntervalMinutes` (minutes) + `booking.closeOverdueAlertHours` (hours) editable in the booking group
  - [x] Settings labels moved to a lazy locale area (`locales/lazy/settings.ts`): the dev-release entry was 80.3 KB > 80 with the new strings
- Tests: tests/business-bookings.test.tsx (new, 6: tattoo rules, design link, source filter + export, origin rows, details without account, TO_CLOSE + alert kind + settings); catalog/settings-domain/branchesContract updated; `sh scripts/gate.sh` GATE OK (all suites, 4 builds, check:size)
- Browser check (mock dev-debug build, preview :4173, built-in browser): EN light desktop — bookings headers incl. "Made by", source options, `?source=MERCHANT` → 1 row + chip, tabs incl. "To close", booking WAB-000003 shows "Hiba Saleh · No WAB account" / "The business" / "Created by Sara Ali", no customer link, settings shows both new labels, salons type switch has "Tattoo studios"; AR dark 375 — catalog (3 types; Tattoo → `?type=TATTOO`, empty list), booking details (screenshot checked by eye), bookings (radio "بحاجة إلى إغلاق", "استوديوهات الوشم"), settings, alerts: 0 overflow, 0 error states, console 0 errors
- Loops: 1/1 — re-read §5.20/§5.21 admin points against list, details, export, alerts, settings; found and fixed: mock filter complexity, entry budget (settings lazy)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔ (contract 1.16.0 consumed; server-side filters only), QA ✔)
- Notes: DEVIATIONS — one branch for ADM-111 + ADM-112 (the api:sync broke both type sets at once); no e2e (owner decision 2026-10-14); the mock does not filter by tab (server does); "BOOKINGS_CREATE in the permission labels" — the panel shows no permission labels (member rows show roles only), nothing to add.

### ADM-111 — Tattoo studios in the panel

- Branch: `feat/adm-111-tattoo`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.23; SRV-183; contract 1.14.0+):
  - [x] `npm run api:sync` → admin contract 1.16.0 (TATTOO, source/createdBy, nullable customer id, TO_CLOSE, alert kind)
  - [x] Kernel: `BUSINESS_TYPES` + TATTOO; `audiencesFor`/`audienceFor` force BOTH for every non-salon; catalog create fixes TATTOO to BOTH; tone + AR/EN labels ("Tattoo studio(s)" / "استوديو وشم", "استوديوهات الوشم")
  - [x] Every business-type switch (salons, applications, bookings, reviews, catalog, requests, placements) gains Tattoo through the shared list (no per-screen code); applications need the trade license only (medical flag stays CLINIC)
  - [x] Booking details: "Design" column with a "View design image" link (signed URL, new tab) when any person has one
  - [x] Texts that named only salons/clinics generalised (catalog subtitle, audience error, "Always for everyone")
- Tests / gate / browser check: see ADM-112 (same branch)
- Loops: 1/1 — see ADM-112
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — see ADM-112

## Last blocks

### ADM-110 — Catalog per business type + salon audience dialog (widen/narrow, conflict list)

- Branch: `feat/adm-110-catalog-types`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.19, §5.12, §5.13; INTEGRATION §5a; SRV-178; operations getCatalogServices, postCatalogServices, patchCatalogServicesById, postCatalogRequestsByIdApprove, getRecommended, putRecommendedReorder, patchSalonsByIdAudience):
  - [x] Catalog managed per type: Salons / Clinics switch (salons first), salon services filtered by audience (All / Women / Men / Men & women), clinic services have no audience filter; type + audience badges per row
  - [x] Create: type + audience fields (`BusinessKindFields`), CLINIC fixed to BOTH (disabled + hint), defaults from the current type/audience filter; edit: type and audience read-only (the server's patch takes neither)
  - [x] Approve a request by mapping: only active services that fit the salon (`catalogFits`, same rule as the server)
  - [x] Placements per type (Recommended salons / Recommended clinics), reorder per type, salon picker of the same type (built in ADM-109, kept)
  - [x] Salon audience drawer (`AudienceDrawer`) replaces the old gender change: SALON only (no button for a clinic), current audience shown, only other audiences offered, widening vs narrowing explained, mandatory reason; 409 SCHEDULE_CONFLICT → conflict list (booking links with reference + time, first 10, then a count); other errors inline; strings are a lazy locale area (`salonAudience`)
  - [x] Mock: narrowing with open bookings → 409 with booking ids, clinic → 422 AUDIENCE_CHANGE_NOT_ALLOWED, same audience → 422
- Tests: new tests/salon-audience.test.tsx (6), tests/catalog.test.tsx (catalogKindOf + per-type page + create defaults); `vitest run` 121 files / 1404 tests green; `sh scripts/gate.sh` GATE OK (dev-release entry back under 80 KB after the lazy `salonAudience` area)
- Browser check (both tasks, mock dev-debug build, vite preview :4197, real Chrome via Playwright): 14 screens (salons all/clinics, applications list + clinic review, catalog salons/clinics, catalog requests, bookings all/clinics + details, reviews, recommended, salon details Noor + Glow Clinic) × AR/EN × light/dark × 1440/768/375 = 168 visits: 0 horizontal overflow, 0 error states, 0 sign-outs; type badges counted per page (salons 4, clinics 1, applications 3, bookings 4, recommended 3); actions in EN light 1440 and AR dark 375: clinic has no audience button, narrowing Noor → 409 with 2 booking links (drawer no overflow), widening Royal → saved, new clinic service = CLINIC/BOTH with audience disabled, bookings All → Clinics 4 → 0 rows with `type=CLINIC` in the URL, clinic application shows the medical license heading; console: only the app logger's `http.failed` warning for the expected 409; screenshots AR light 1440 salons/catalog/clinic application, EN dark 375 catalog, conflict drawer (EN 1440, AR 375) checked by eye; the loop fixed unlocalised digits and unstyled links in the conflict list
- Loops: 1/1 — re-checked every criterion against the diff, the tests and the browser run; found and fixed: dev-release entry 80.2 KB > 80 (drawer strings moved to the lazy `salonAudience` area), conflict-list digits not localised and links unstyled (now `formatNumber` + `Link`), catalog subtitle still salon-only
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — rules shared with the server (`catalogFits`, widening, clinic = BOTH) live in the domain kernel; drawer, conflict list and catalog filters are small single-purpose components; server-side filters only; contract-driven types
- Notes: DEVIATIONS: no e2e (user decision 2026-10-14); WebKit not run; not pushed (lead instruction); placements have no audience filter (the order is per type; a filtered reorder would send a partial list)
