# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) waits for SRV-011; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

- (none) — run `python3 scripts/tasks.py next admin`; task branches start from `origin/admin`.

## Last blocks

### ADM-069 — global search

- Branch: `feat/adm-069-global-search`
- Status: DONE
- Acceptance criteria: top-bar search wired to GET /search: customers, salons, bookings, members grouped with links; 500 ms debounce, min 2 chars, loading/empty/error states
- Tests: tests/search.test.tsx (4); full suite + gate PASS
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch.

### ADM-070 — salon editing by admin

- Branch: `feat/adm-070-salon-edit`
- Status: DONE
- Acceptance criteria: page /salons/:id/edit with six tabs (profile and location with cover/logo upload, gallery add/remove/reorder, weekly hours with affected-bookings preview and closures add/change/remove, services menu, staff profile, payment and cancellation policy); every write asks for a reason; AR+EN
- Tests: tests/salonEdit.test.tsx (15); full suite + gate PASS
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch. DEVIATION: gallery adds images only (videos need a thumbnail and duration); service media keys not edited; area is not editable (server patch cannot clear it).

### ADM-071 — booking extras

- Branch: `feat/adm-071-booking-extras`
- Status: DONE
- Acceptance criteria: booking page: reassign staff from the eligible list, cancel as customer/salon/admin, refund a chosen amount (never above paid minus refunded), bookings export; plus fixes to ADM-070: server id patterns that no real id matches are overridden in the salon-edit requests (gallery order, add service, staff, profile city) and the service drawer picks the first catalog entry that arrives late
- Tests: tests/bookingExtras.test.tsx (8) and 1 more salonEdit test; full suite + gate PASS
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch. DEVIATION: ADM-070 shipped with a defect (requests carrying ids failed client validation because of the server's broken id regex); found by a new end-to-end test here and fixed in this PR.
