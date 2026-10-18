# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-005 — Redis `LimitStore`
- Branch: `feat/otp-005-redis-store`
- Acceptance: one atomic Lua script per hit (INCR + PEXPIRE, block on reaching the limit, counter healed if it lost its TTL), atomic cooldown (`SET NX PX`), shared block key, reset; works with any injected ioredis-shaped client; outages → retryable `OTP_STORE_UNAVAILABLE` without leaking server text; malformed replies → `OTP_MALFORMED_RESPONSE`.
- Assumed missing: Redis Cluster key slots (counter and block keys of a phone are not hash-tagged; fine on single-node/managed primary, noted in Integration.md).
- Tests: real `redis-server` on localhost in `tests/helpers/redis.ts` (or `REDIS_TEST_URL`); 40-way concurrent hit proves exactly `limit` hits pass; `npm run verify` green (75 tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found a real bug: `resendAfterSec: 0` made Redis reject `SET PX 0`; the limits engine now skips the cooldown when it is 0 (regression test through the real store).
