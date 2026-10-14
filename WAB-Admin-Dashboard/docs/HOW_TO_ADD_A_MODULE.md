# How to add a feature module

A feature (salons, bookings, refunds, …) is a **vertical slice** across the layers. The slice rules are enforced by `npm run check:layers` (`.dependency-cruiser.cjs`, rules `feature-isolation-*`) and by `tests/layers.test.ts`.

## Folders

```
src/domain/<feature>/         entities, enums, <Feature>Repository interface, pure use-case functions
src/data/<feature>/           mapper (DTO -> entity), Remote<Feature>Repository, Mock<Feature>Repository
src/data/mock/fixtures/       <feature>.ts  (typed by the generated DTOs)
src/presentation/<feature>/   use<Feature>Controller.ts, <Feature>Page.tsx, components/
src/app/routes.tsx            lazy route          src/constants/nav.ts   nav entry
src/locales/{ar,en}/<area>.json every new string, same keys (files stay under 300 lines)
tests/<feature>/              domain, mapper/repository, controller + page tests
e2e/<feature>.spec.ts         smoke test of the screen
```

## Import rules (what the checker enforces)

| From | May import | Never imports |
| --- | --- | --- |
| `domain/<f>` | itself, `domain/shared` | another `domain/<g>`, any other layer |
| `data/<f>` | itself, `domain/*`, `data/shared`, `data/contract`, `data/mock`, `infrastructure`, `constants` | another `data/<g>`, `presentation`, `app` |
| `presentation/<f>` | itself, `components`, `layout`, `hooks`, `controllers`, `pages`, `utils`, `shared`, `domain`, `design`, `infrastructure` | another `presentation/<g>`, `data` (use `useContainer()`) |

Two features that need the same thing move it to the shared directory of the layer (for example `domain/shared`) instead of importing each other. Cross-feature navigation goes through `constants/routes.ts`; cross-feature data is read through the container's repositories, not through the other feature's files.

## Calling the API (`src/data/api`)

A repository never builds URLs or parses responses itself. It defines each endpoint once from the generated contract and runs it through `ApiClient`:

```ts
const listSalons = defineEndpoint(OPERATIONS.getSalons, { data: getSalonsDataSchema, query: getSalonsQuerySchema });
const approve = defineEndpoint(OPERATIONS.postSalonsApplicationsByIdApprove, { data: ..., body: ... }, { idempotent: true });

api.executePage(listSalons, { query, signal });          // Page<Item> = items + meta
api.execute(approve, { params: { id }, body });          // body/query are checked before anything is sent
useQuery({ queryKey: queryKey(listSalons, { query }), queryFn: ({ signal }) => ... });  // unmount aborts
```

- `defineEndpoint` throws when the schemas disagree with the contract (body/query present or missing), so a contract change fails the first test that imports the endpoint.
- Server errors arrive as `AppError` with `traceId` and `details[]` (`fieldErrorsFrom` maps them onto form fields); a failed local check uses the same shape with `body.<field>` names.
- `idempotent: true` adds a fresh `Idempotency-Key` per call (reuse the key when retrying the same command). OPEN: the admin OpenAPI does not define this header yet; the server must accept it before the client relies on it.

## Checklist (copy into the task block in `.claude/session.md`)

1. **Read** the PRD page, the BRD ids, the task row, the Design Script and `design/*.dc.html`; list the admin operations the task consumes (`src/data/contract/generated/operations.ts`, `docs/WAB_Admin_Tasks.md` Appendix A). If the server lacks one, the task is `PENDING` with the gap id — do not invent endpoints.
2. **Domain:** entities and enums copied from `BUSINESS_DOMAIN.md` names; repository interface; pure rules with unit tests.
3. **Data:** DTO schemas come from `api:sync` output (never hand-written); mapper + `Remote…Repository` over `HttpClient`; fixture + `Mock…Repository`; register both in `app/container.ts` behind `VITE_DATA_SOURCE`.
4. **Presentation:** controller hook (TanStack Query, key factory) → page built from base components; loading, empty, error with retry, forbidden, validation and realtime states.
5. **Constants and text:** paths in `constants/endpoints.ts`, routes in `constants/routes.ts`, nav in `constants/nav.ts`; Arabic **and** English strings; no literal URLs, colors, sizes or timings.
6. **Tests:** unit per layer, page test, e2e smoke; coverage floor holds (`npm run test:coverage`).
7. **Gate:** `npm run verify`, four variant builds, `npm run check:size`, e2e, browser check in AR/EN, light/dark, phone/tablet/desktop (`.claude/rules.md` §6, §8).
8. **Docs:** task row to `DONE`, `.claude/session.md` block with `Loops: 3/3` and `Review: PASSED`, durable facts to `.claude/memory.md`.
