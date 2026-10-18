# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-008 — Identity linking across guest and registered history
- Branch: `feat/ana-008-identity`
- Status: IN REVIEW
- Acceptance: an installation linked with `linkIdentity` takes the account's subject (`TYPE:id`) in funnels and cohorts, so guest app events and registered server events are ONE actor; several accounts on one device split by the event's Firebase user id (else the smallest account key, deterministic); unlinked installations stay separate guests (`inst:` / `user:`); new `source: 'ALL'` (server + app) for count, funnel and cohorts, per-source scan limit with `truncated`; journeys already merge every installation of the actor.
- Assumed missing: Firebase `user_id` equals our account id (apps set it at login); the account type of an unlinked app user is unknown, so such users cannot be merged until a link exists (the apps send the instance id at login, Customer/Merchant PRD §14); a device used by several accounts shows in each account's journey.
- Tests: `npm run verify` green (152 tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA: ALL needs a warehouse in count/funnel/cohorts, unknown source rejected, truncation if either source overflows.

### ANA-007 — BigQuery adapter
- Status: DONE (PR #228)
