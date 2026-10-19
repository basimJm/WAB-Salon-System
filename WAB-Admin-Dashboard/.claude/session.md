# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) waits for SRV-011; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

- (none) — run `python3 scripts/tasks.py next admin`; task branches start from `origin/admin`.

## Last blocks

### ADM-072 — customer extras

- Branch: `feat/adm-072-customer-extras`
- Status: DONE
- Acceptance criteria: customer page: edit profile, send one push, delete now (skips the 30-day grace), reviews written and notifications received tabs (paginated); every write needs a reason
- Tests: tests/customerExtras.test.tsx (10); full suite + gate PASS
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch.

### ADM-073 — salon list columns and insights

- Branch: `feat/adm-073-salon-insights`
- Status: DONE
- Acceptance criteria: salon list: subscription, recommended and deletion-request filters, recommended and bookings (30 days) columns; salon page: insights tab (KPIs, completion, status chart, bookings per day for a range), admin activity tab, deletion-request approve/reject with a reason
- Tests: tests/salonInsights.test.tsx (9); full suite + gate PASS; fixture exemption list removed (every operation has a fixture)
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch.

### ADM-006 — hosting headers and deploy config (Netlify and Vercel)

- Branch: `feat/adm-006-headers`
- Status: DONE
- Acceptance criteria: versioned security-header spec (CSP with API and socket origins, HSTS, nosniff, frame-ancestors none, cache rules) + generator for Netlify _headers/_redirects and vercel.json + netlify.toml + docs/DEPLOY.md; the owner chose Vercel or Netlify
- Tests: tests/hosting.test.ts (13); full suite + gate PASS; browser check: built dev-release served with the generated headers, login and 9 screens walk with 0 CSP violations after allowing data: fonts (a real defect the check found), fonts 6 loaded 0 errors
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch.
