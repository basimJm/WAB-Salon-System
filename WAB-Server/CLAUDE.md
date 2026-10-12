# WAB-Server — Rules for AI Agents

> These rules add to the root `CLAUDE.md` and `.claude/*.md`. They never relax them. If two rules conflict, the stricter one wins. If documents conflict, stop and ask.

## 0. Read Before Every Task (mandatory)
1. Root `CLAUDE.md` and **every** `.md` file in the root `.claude/` folder: `rules.md`, `roles.md`, `hooks.md`, `session.md`, `memory.md`.
2. `BUSINESS_DOMAIN.md`: the data model, enums, business rules, state machine, permissions, jobs, settings and error codes.
3. `WAB-Server/docs/WAB_Backend_BRD.md`, plus the PRD section of every client the endpoint serves (Customer, Merchant or Admin PRD).
4. `INTEGRATION_WORKFLOW.md` and the matching contract in `contracts/`.

## 1. Business Domain First (double-check rule)
- Every schema, enum, rule, status transition, permission, job, setting and error code comes from `BUSINESS_DOMAIN.md`. Do not invent fields or behaviour.
- **Check twice.**
  - **Before coding:** list the `BUSINESS_DOMAIN.md` sections and BRD requirement IDs (`BE-xx`, `NFR-xx`) the task touches. Put them in the task's acceptance criteria in `session.md`.
  - **Before pushing:** re-read those same sections and confirm that the code, the tests and the contract match each one. Record this in verification loop 1.
- If the code needs something the domain does not define, or the documents disagree, stop and ask. Do not guess. When the user decides, update `BUSINESS_DOMAIN.md` in the same PR.

## 2. Architecture (TypeScript, layered, SOLID)
- TypeScript `strict` mode. No `any`; use `unknown` and narrow it. Express, Mongoose, Redis, Socket.IO and BullMQ.
- One direction of flow:
  **route → middleware → controller → service → repository → schema (Mongoose model)**
  | Layer | Responsibility | Must not |
  |---|---|---|
  | Route | Declares path, method and middleware chain; mounted under its namespace root | Contain logic |
  | Middleware | Cross-cutting work: language, auth, token scope, merchant permission, validation, rate limit, request ID, errors | Contain business rules |
  | Controller | Reads the validated request, calls one service, returns the base success response | Touch the DB, contain rules, build error JSON |
  | Service | Business logic and orchestration; throws typed errors | Know about `req`/`res` |
  | Repository | The only code that queries MongoDB; returns plain typed objects | Contain business rules |
  | Schema | Mongoose schema, indexes and types exactly as in `BUSINESS_DOMAIN.md` | Contain business logic |
- External services (payments, OTP, push and email, storage, analytics) are used only through the `wab-*` package interfaces, injected into services so they can be faked in tests.

## 3. Separate Customer, Merchant and Admin Modules
- There are three namespaces, each with its own router root, token scope and modules. A token from one scope never works on another.
  ```
  src/modules/customer/<feature>/   → /customer/v1
  src/modules/merchant/<feature>/   → /merchant/v1   (+ merchant permission middleware on every route)
  src/modules/admin/<feature>/      → /admin/v1      (+ reason + audit log on every write)
  ```
- A module never imports from another namespace's module.
- Logic that more than one namespace needs (availability, the booking state machine, refunds, ratings, notifications) lives once in `src/domain/<area>/`, and modules call it.
- Each feature folder holds: `<feature>.routes.ts`, `.controller.ts`, `.service.ts`, `.validation.ts`, `.types.ts`, and its tests.

## 4. Folder Layout
```
src/
  app.ts, server.ts         # app wiring; process start/stop
  routes/index.ts           # root router: mounts /customer/v1, /merchant/v1, /admin/v1, health
  config/                   # validated env config (fails fast at startup); no defaults for secrets
  constants/                # ALL static values: limits, timeouts, enums, error codes, HTTP status, keys, regexes
  locales/ar.json, en.json  # every user-facing message key, in both languages
  middlewares/              # language, requestId, auth, scope, permission, validate, rateLimit, notFound, errorHandler
  models/                   # Mongoose schemas (shared by all namespaces)
  repositories/             # data access per collection
  domain/                   # shared business logic used by more than one namespace
  modules/customer|merchant|admin/<feature>/
  jobs/, sockets/           # BullMQ processors and Socket.IO handlers (same layering: thin handler → service)
  utils/                    # ALL shared helpers: errors/, response/, i18n/, money/, time/, pagination/, logger/, async/
```

## 5. No Hardcoding, No Static Data in Code
- Values that change between environments (URLs, hosts, ports, keys, secrets, DB names, gateway IDs) come from `config/`, which reads them from env. Never commit `.env*` files except `.env.example`, and never edit `.env*` files without permission.
- Static values (limits, timeouts, page sizes, regexes, status codes, error codes, enum values, cache keys, queue names, socket event names) come from `constants/`.
- Business-tunable values (deposit %, OTP limits, reminder offsets, auto-cancel delay and so on) come from the `settings` collection (`BUSINESS_DOMAIN.md`), with defaults kept in `constants/`.
- User-visible text comes from `locales/` only.
- Inline literals are allowed only for `0`, `1` and `-1` used for arithmetic or indexing, and for strings in tests. Everything else gets a name.

## 6. Base Responses (always)
Every endpoint returns one of two shapes, built only by the helpers in `utils/response/`. Never hand-write `res.json(...)`.
```jsonc
// success
{ "success": true,  "message": "<localized>", "data": { ... } | [ ... ] | null,
  "meta": { "page": 1, "pageSize": 10, "total": 42 } }          // meta only for paginated lists
// error
{ "success": false, "message": "<localized>",
  "error": { "code": "BOOKING_SLOT_TAKEN", "details": [ ... ], "traceId": "<request id>" } }
```
- `code` values come from the error codes in `BUSINESS_DOMAIN.md` and are mirrored in `constants/`. Clients branch on `code`, never on `message`.
- `details` holds field-level validation errors as `{ field, code, message }`.

## 7. Arabic and English for Every Response
- Read `Accept-Language` (`ar` | `en`; default `ar`) in middleware, and localize every `message` and every validation detail.
- Add every new message key to **both** `ar.json` and `en.json`. A unit test fails if a key is missing from either file or if any value is empty.
- Content stored in two languages (service names, salon descriptions, content pages, notifications) is saved as `{ ar, en }`:
  - customer and merchant responses return the requested language;
  - admin responses return both, so the admin can edit them.
- Notifications and push messages are localized to the recipient's saved language, not the language of the request.

## 8. Errors (handle every error, including unexpected ones)
- All errors extend `BaseError` in `utils/errors/`. Each error carries `code`, `httpStatus`, `messageKey`, optional `details`, and an `isOperational` flag.
- Subclasses: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409, e.g. slot taken), `BusinessRuleError` (422), `RateLimitError` (429), `PaymentError`, `ExternalServiceError` (502/503), `InternalError` (500).
- Services throw typed errors only. Never throw strings, never return error objects, and never swallow an error without logging it.
- **One** global `errorHandler` middleware turns every error into the base error response. It also maps library errors:
  - Mongoose: `CastError` → 400, `ValidationError` → 400, duplicate key `11000` → 409;
  - JWT: expired or invalid → 401;
  - schema validator → 400 with field details;
  - malformed JSON or payload too large → 400 or 413;
  - unknown route → 404 (`notFound` middleware);
  - timeouts and gateway or provider failures → 502 or 503.
- **Unknown errors** become `INTERNAL_ERROR` (500) with a generic localized message. Stack traces, queries and provider payloads are logged, never returned.
- Async route handlers are wrapped by `utils/async` so a rejected promise always reaches the error handler.
- Socket.IO handlers and BullMQ processors use the same error utilities. Failed jobs retry with backoff from `constants/` and are logged as server events.
- At process level, handle `unhandledRejection` and `uncaughtException` by logging, closing DB, Redis and HTTP connections, and exiting so the process restarts. On `SIGTERM`, shut down gracefully.
- Calls to external services have timeouts and limited retries (from config or constants) and map provider errors to `ExternalServiceError` or `PaymentError`.
- Logs are structured and include `traceId`. Never log tokens, OTPs, passwords, card data or full phone numbers.

## 9. Clean, Reusable, Readable, Scalable
- Never duplicate code. Before writing a helper, search `utils/`, `domain/` and `repositories/`. If logic appears twice, extract it.
- Use small, single-purpose functions and intention-revealing names. Return early instead of nesting. Comment the *why*, not the *what*.
- Validate every input (body, params, query, headers, socket payloads, webhooks) with a schema in `<feature>.validation.ts`, through the `validate` middleware.
- Design for scale:
  - every list is paginated (page sizes from constants);
  - every query is backed by an index declared in its schema;
  - no N+1 queries; select only the fields needed;
  - use Redis for locks, rate limits and cache, as `BUSINESS_DOMAIN.md` specifies;
  - keep services stateless so several instances can run.
- Money is integer fils, and time is UTC computed in `Asia/Amman`, both handled only through `utils/money` and `utils/time`.

## 10. Tests and Delivery
- Every task ships with unit tests: services and domain rules first (availability, state machine, refunds, permissions, pricing), plus the error handler, the response helpers and the locale-completeness check. All tests, lint, type-check and build must pass.
- Every endpoint change updates its OpenAPI contract in `contracts/`, Swagger and the Postman collection in the same PR (see §11).
- Follow the root workflow: branch from an updated `main`, run three verification loops (loop 1 includes the business-domain double-check), do the four-role review, then open a PR. Never push to `main`.

## 11. Swagger and Postman: updated after every task (mandatory)
- The API docs are generated from code and live in the repo. Do not edit the generated files by hand.
  | What | Where |
  |---|---|
  | OpenAPI definition of an endpoint | `<feature>.openapi.ts` next to its routes, built from the same zod schemas as `<feature>.validation.ts` |
  | Registration per namespace | `src/docs/index.ts` (`common`, `customer`, `merchant`, `admin`) |
  | Swagger / OpenAPI output | `docs/api/openapi.<name>.json`, served as Swagger UI at `/docs` outside production |
  | Postman output | `docs/api/postman/WAB-<Name>.postman_collection.json` and `WAB.postman_environment.json` |
- **After every task**, before the PR is opened and again before it is merged:
  1. If the task adds, changes or removes an endpoint, request or response schema, header or error code, update its `*.openapi.ts` and register it in `src/docs/index.ts`.
  2. Run `npm run docs` and commit the regenerated `docs/api/**` files in the same PR, so `main` always matches the code after the merge.
  3. If the task changes no API, write `API docs: no change` in the task block of `session.md`.
- **If the files do not exist, create them** with `npm run docs`. Never skip the step because they are missing.
- Mount every feature router with `mount(router, path, child)` from `src/routes/mount.ts` (not a bare `router.use(path, child)`), so the docs test can find all routes.
- `tests/docs.test.ts` fails when a committed file is stale, when a route has no OpenAPI entry, or when an OpenAPI entry has no route. A task is not done while it fails.
- Postman requests use `{{baseUrl}}`, `{{language}}` and a token variable per namespace (`{{customerToken}}`, `{{merchantToken}}`, `{{adminToken}}`). Never put real tokens, hosts or keys in the files.
