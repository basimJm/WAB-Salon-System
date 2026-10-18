# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-006 — Firebase ID-token adapter
- Branch: `feat/otp-006-firebase`
- Acceptance: verify Firebase Phone Auth ID tokens with `jose` (no firebase-admin; vendor-neutral `ProofVerifier`): RS256 only, signature against Google's JWK endpoint, issuer `https://securetoken.google.com/<project>`, audience = project id, exp/iat/sub required, clock-skew tolerance from options, `auth_time` freshness window, `firebase.sign_in_provider == phone`, E.164 `phone_number`, then phone match. Outcomes: VERIFIED / PHONE_MISMATCH / EXPIRED (expired token or stale sign-in) / INVALID_PROOF (everything else incl. alg none, forged key, unknown kid). Key cache honours Cache-Control (floor 60 s), one download for concurrent callers, re-fetch on unknown kid (rotation, at most once per minute), stale keys served up to 24 h when Google is down; every status / network / timeout / bad body mapped to a typed error with retry only where retryable; proxy support by injecting `fetch`.
- Assumed missing: purpose cannot be bound by Firebase tokens; `maxAuthAgeSec` default 600 s is my assumption (confirm); jose 5 (dual CJS/ESM) chosen because jose 6 is ESM-only and breaks the CJS build.
- Tests: locally generated RSA keys sign test tokens against a stubbed key endpoint; real-Firebase check NOT run (no network/credentials here). `npm run verify` green.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found three real bugs before merge: HTTP 5xx/429 from the key endpoint were not retried, a `null` JSON body crashed with TypeError, and aborting in `finally` would have cut the response body; also a time-dependent flaky assertion from OTP-004 fixed.
