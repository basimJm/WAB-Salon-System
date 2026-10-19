# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) waits for SRV-011; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

- (none) — run `python3 scripts/tasks.py next admin`; task branches start from `origin/admin`.

## Last blocks

### T-096 — ADM-078 fixture tests

- Branch: `feat/adm-078-fixture-tests`
- Status: DONE
- Tests: 3 new tests; gate green
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: no e2e (user decision).

### ADM-068 — admin profile

- Branch: `feat/adm-068-admin-profile`
- Status: DONE
- Acceptance criteria: profile page: account, alert recipients, password change, two-step email change; error codes CURRENT_PASSWORD_INVALID/EMAIL_ALREADY_USED; contract resynced with 34 new operations
- Tests: tests/profile.test.tsx (8); full suite + gate PASS
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch. DEVIATION: the reports sources (domain, data, page) were rebuilt from tests and mocks because they were never committed; salon mock gained the new server fields.

### ADM-069 — global search

- Branch: `feat/adm-069-global-search`
- Status: DONE
- Acceptance criteria: top-bar search wired to GET /search: customers, salons, bookings, members grouped with links; 500 ms debounce, min 2 chars, loading/empty/error states
- Tests: tests/search.test.tsx (4); full suite + gate PASS
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch.
