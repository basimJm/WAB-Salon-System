# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) waits for SRV-011; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

- (none) — run `python3 scripts/tasks.py next admin`; task branches start from `origin/admin`.

## Last blocks

### ADM-006 — hosting headers and deploy config (Netlify and Vercel)

- Branch: `feat/adm-006-headers`
- Status: DONE
- Acceptance criteria: versioned security-header spec (CSP with API and socket origins, HSTS, nosniff, frame-ancestors none, cache rules) + generator for Netlify _headers/_redirects and vercel.json + netlify.toml + docs/DEPLOY.md; the owner chose Vercel or Netlify
- Tests: tests/hosting.test.ts (13); full suite + gate PASS; browser check: built dev-release served with the generated headers, login and 9 screens walk with 0 CSP violations after allowing data: fonts (a real defect the check found), fonts 6 loaded 0 errors
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch.

### ADM-084 — real data by default and placeholder base URLs

- Branch: `feat/adm-084-remote-default`
- Status: DONE
- Acceptance criteria: dev-debug is the only variant with the mock by default; dev-release, prod-debug, prod-release use the real API (the mock code is no longer shipped in dev-release); committed placeholder base URLs in .env.dev and .env.prod (public values, guarded by tests/envFiles.test.ts) for the owner to replace; the design gallery stays in all dev builds
- Tests: tests/config.test.ts, tests/envFiles.test.ts (5), tests/about-ribbon.test.tsx updated; full suite + gate PASS
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch. DEVIATION: root rule 'never commit .env*' relaxed by the owner's request for placeholder URLs; browser check of this change done together with the real-server QA that follows.

### ADM-085 — real-server QA and fixes

- Branch: `feat/adm-085-real-server-fixes`
- Status: DONE
- Acceptance criteria: all 33 list screens, the detail pages and every write flow of ADM-068..073 (salon edit with real MinIO uploads, bookings, customers, reviews, recommended, subscriptions, settings, locations, versions, maintenance, catalog, banners, contact, FAQ, campaigns, profile, applications) driven in a browser against a real local WAB-Server with seeded data; fixed what it found: alerts and exports lists failed on real answers (empty data/params left out), send-now campaigns were stored as 1 Jan 1970, exports sent a header the server refuses, reassign offered for bookings the server refuses
- Tests: tests/realServerShapes.test.ts (4), tests/bookingExtras.test.tsx (+2), full suite + gate PASS; qa/ tooling + docs/REAL_SERVER_QA.md + docs/SERVER_ISSUES.md; contract check of every real GET answer against the generated schemas: only getAlerts and getExports were BAD (fixed)
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch. DEVIATION: browser check done in the built-in browser with JS-driven clicks (not e2e); payouts creation, refunds of paid bookings and the realtime socket were not exercised (no money settled).
