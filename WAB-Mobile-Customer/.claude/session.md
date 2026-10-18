# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-011 session store, CUS-012, CUS-013, then features from CUS-024; task branches start from `origin/customer`.

### CUS-006 — Network kernel: envelope, error-code catalog, retry/timeouts
- Branch: `feat/cus-006-network-kernel`
- Status: DONE
- Acceptance criteria (server CLAUDE.md §6–8, BUSINESS_DOMAIN §11, PRD §3.4, CLAUDE.md §3):
  - [x] `ErrorEnvelopeDto` → `AppError.ServerError(code: ErrorCode, statusCode, message, details, traceId)`; `ErrorCode` = 41 BUSINESS_DOMAIN §11 codes + `UNKNOWN`; non-envelope HTTP → `HttpError`; transport → `NetworkError`; the template's `ApiErrorDto` removed
  - [x] 42 AR + EN strings (`error_code_*`), `ERROR_CODE_STRINGS` table + `errorResource`, `appErrorMessage` (composable) and `appErrorText` (ViewModels); main + sample ViewModels use the catalog
  - [x] `NetworkDefaults` constants; GET-only `HttpRequestRetry` with exponential backoff; `BaseResponse.meta` (`PaginationMetaDto.hasMore`); `AuthEndpoints` confirmed against `openapi.customer.json`
  - [x] Tests: `ErrorCodeTest` (2), `SafeApiCallTest` (6, MockEngine), `ErrorTextTest` (2, every code has its own string)
- Tests: `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — clients branch on `code`; writes are never retried; bodies never logged; baseline shrank (removed `println`).
- Notes: owner instruction 2026-10-18: continue task after task without stopping. `PageableDto` (Laravel-style) stays until CUS-009/010 rebuild the paging source on `BaseResponse.meta`.

### CUS-009 — Contract tooling: generated DTOs + operation registry from the server OpenAPI
- Branch: `feat/cus-009-api-sync`
- Status: DONE
- Acceptance criteria (INTEGRATION.md §3; admin ADM-004 pattern):
  - [x] `scripts/api_sync.py` renders `@Serializable` DTOs per tag + `Components.kt` (nullability from `required`/`null`, nested objects and array items named by path, enum docs, keyword escaping) and `CustomerOperations` (51 ops: method, path, tag, path/query params, body/data types, spec sha); `--check` fails on stale or extra files; snapshot kept next to the code
  - [x] `./gradlew apiSync` / `apiSyncCheck`; gate step "Contract"; generated dir excluded from the 300-line/hardcoded policies and detekt; compiles for Android + iOS
  - [x] `test_api_sync.py` (4 tests: ids, nullability/enums/items/keywords, registry, check mode)
- Tests: policy tests 75 ok; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — repositories will build requests from `CustomerOperations`, never from path literals; the snapshot sha makes drift visible in review.
- Notes: Python generator (same toolchain as the policy scripts); enums stay `String` with the allowed values in KDoc until features need typed enums.

### CUS-010 — Mock data source: fixtures per operation, scenario switcher, DATA_SOURCE config
- Branch: `feat/cus-010-mock-source`
- Status: IN REVIEW
- Acceptance criteria (INTEGRATION.md §4; backlog row):
  - [x] `DataSource` in `AppEnvironment` from `DATA_SOURCE` (Android build config from `DEV_/PROD_DATA_SOURCE`; iOS xcconfig + Info.plist); prod refuses `mock`; policy variants check the keys
  - [x] `api_sync.py` also generates `MockFixtures` (success envelope per operation from the response schema, text markers localized by Accept-Language)
  - [x] `core/data/mock`: `createMockEngine` (Ktor MockEngine over `CustomerOperations`, path templates, 404 envelope for unknown paths), `MockScenarios` (Success / Empty / Unauthorized / NotFound / ServerError / Timeout / Offline), `mockDataModule` binds the `HttpEngineProvider` seam of `core/network`
  - [x] Tests: `MockTransportTest` (5: matching, every operation has a fixture, localization, scenarios, unknown path), `AppEnvironmentTest` data source, `test_api_sync` fixtures, `test_variants` keys
- Tests: policy suite 76 OK; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0 (BUILD SUCCESSFUL 3m04s; 4 iOS configurations + K/N tests)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — fixture keys derived from method+path exactly like the generator (no index coupling); error envelopes carry only `code` (clients never show mock text); mock refused in prod by `AppEnvironment`; `ktor-client-mock` ships in the main source set so the engine choice stays a runtime config (prod binaries carry it unused).
- Notes: the scenario switcher UI lands with the profile screen (CUS-053); until then `MockScenarios.set` is called from code/tests. No visible screen changed → no simulator UI check. Dev builds now serve fixtures by default (`DEV_DATA_SOURCE=mock`); CUS-060 flips dev to `remote` once the dev API exists.
