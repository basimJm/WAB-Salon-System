# WAB-Mobile-Customer: current task

> Only the task in progress lives here. When it merges, move its block to `docs/knowledge/session-archive.md`.

### CUS-113 — Push token: FCM registration and the installation sync loop
- Branch: `fix/cus-113-fcm-register`
- Status: IN REVIEW
- Acceptance criteria (PRD §10.2 / §14; no API change, `PUT /installations` as before):
  - [x] The manifest sets `firebase_messaging_installation_id_enabled` to `true`: firebase-messaging 26 `register()` no longer throws `API disabled`.
  - [x] `AndroidPushTokenProvider.currentToken()` returns the token `PushTokenRelay` already holds without another `register()`, and logs the class and message of each failure it catches (tag `FCM`, never a token).
  - [x] `InstallationSyncer` never refreshes for the same token twice in a row; a sync that republishes the token ends after the token's one sync.
  - [x] Policy check S005 fails when `firebaseMessaging` is 26+ and the manifest lacks the flag set to `true`.
  - [ ] Device proof (owner): a push from the hosted server shows a notification on the customer device with the app in the background (needs the notifications permission on).
- Tests: `InstallationSyncerTest` (two new cases: same token twice and a new token; the republish loop), `FirebaseFacadeTest` (`PushTokenRelay.latest`), `scripts/ci/tests/test_security.py` (S005, 4 new cases). Results: `:core:firebase` + `:composeApp` `testAndroidHostTest` 39 passed (InstallationSyncerTest 4, FirebaseFacadeTest 4); policy tests 97 OK; `policy_checks.py all` ok; detekt clean; `:composeApp:compileKotlinIosSimulatorArm64` ok; `assembleDevDebug` ok. Without `distinctUntilChanged` the same-token and loop tests fail (checked). Device `emulator-5556` (dev API): 2 `PUT /installations` (200, launch + the token) in 90 s with the token stored, 0 after Home + reopen, no `API disabled`; the sign-in state of the build was not checked (the sync runs for guests too).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — one pass by the implementing agent over the branch diff, not independent role agents; non-blocking: `AndroidPushTokenProvider` has no unit test (see Notes) Lead read the production diff (provider, sync, manifest, policy check) before merge; not independent role agents. Mobile: no UI, strings or layouts changed; token read and sync checked on the emulators.
- Merged into the master on the owner's order (2026-11-06) before the device proof. The row stays IN REVIEW until a real booking push is seen on the hosted server.
- Notes: The lead's `unittest discover -s scripts/ci` finds no tests (they live in `scripts/ci/tests`, as in CI); that path was used. `AndroidPushTokenProvider` is not unit-tested (`FirebaseMessaging` is final and the module has no mocking library); its behaviour is proven on `emulator-5556` against the dev API. A start with a known token still syncs twice (launch, then the replayed token); the PUT is idempotent.
