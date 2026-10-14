# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-058 — Trim the always-loaded session and memory files

- Project: repo root (`.claude/session.md`, `.claude/memory.md`, `docs/history/*`)
- Branch: `docs/trim-session-memory`
- Status: DONE
- Acceptance criteria:
  - [x] Finished task blocks (T-001..T-054) moved to `docs/history/session-archive.md`; the last 3 + this block stay
  - [x] Server and customer notes of `memory.md` moved to `docs/history/memory-server-customer.md`; admin, repo, delivery and decision facts stay
  - [x] Both loaded files are far shorter; hooks still pass (`python3 .claude/hooks/test_hooks.py`)
- Tests: docs only; hook tests
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — content moved, not deleted.
- Notes: When a block is older than the last 3, move it to the archive file.

### T-059 — ADM-023 Gallery completeness, accessibility with real contrast, visual snapshots

- Project: `WAB-Admin-Dashboard/` (`pages/design/BasicsSection`, `tests/{gallery-coverage,contrast}.test.ts`, `e2e/gallery.spec.ts`, `design/tokens/colors.ts`, `charts.css`, `IconButton`, `RichTextEditor`)
- Branch: `feat/adm-023-gallery`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-023: gallery covers every kit and state; visual and accessibility regression checks, local since there is no CI):
  - [x] A test fails when a shared component is neither shown in the gallery nor named as shown through its parent; a test fails when a section is not mounted; new `BasicsSection` (icons, icon buttons, spinners, alert, async states, error boundary, status page, text area)
  - [x] e2e on real Chrome runs axe (serious/critical, including real colour contrast) over the whole gallery in ar/en x light/dark and saves a screenshot per section to `reports/gallery/<lang>-<theme>/` (git-ignored; compare by eye or with an image diff tool)
  - [x] Real contrast defects found and fixed: light `faint`/`success` text, green/rose badges, dark `faint`, heatmap cells in dark mode; unit test `contrast.test.ts` locks WCAG AA 4.5:1 for every text colour on every surface and every badge tone
  - [x] Name-in-label defects fixed: rich text toolbar shows its names, icon button with a badge includes the count in its accessible name
- Tests: `sh scripts/gate.sh` all PASS; e2e 112/112 on the real Chrome (desktop, Pixel portrait/landscape, tablet), gallery pass 4/4 with contrast
- Browser check: real Chrome through Playwright (axe + 48 screenshots); no console errors
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — jsdom cannot measure colour contrast; the real-Chrome pass found 5 token defects the unit suite could not see.
- Notes: Pixel-diff baselines are not committed (would add MBs); screenshots are artifacts for manual review.

### T-060 — ADM-024 Typed API client (endpoint registry)

- Project: `WAB-Admin-Dashboard/` (`data/api/{endpoint,ApiClient,idempotency,queryKeys}.ts`, `HttpClient` headers + list query values, `Container.api`, `docs/HOW_TO_ADD_A_MODULE.md`, `tests/api-client.test.ts`)
- Branch: `feat/adm-024-endpoint-client`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-024):
  - [x] `defineEndpoint(OPERATIONS.x, {data, body?, query?})` ties a generated operation to its generated schemas and throws when they disagree with the contract flags; paths come only from the contract; `buildPath` fills and encodes `{params}`
  - [x] `ApiClient.execute/executePage`: body and query checked before sending (failure = `AppError` validation with `body.<field>` details, nothing fetched), list query values sent as repeated parameters, caller `signal` passed (unmount aborts), response validated, `executePage` = items + meta (missing meta = contract break)
  - [x] Server `details[]` and `traceId` reach the UI as before (`fieldErrorsFrom`, ErrorState shows the trace id); `queryKey(endpoint, args)` stable key factory; `idempotent` endpoints send a fresh `Idempotency-Key`
- Tests: `sh scripts/gate.sh` all PASS (23 new unit tests); no UI change so no browser/e2e run
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — OPEN ITEM for the server owner: the admin OpenAPI defines no `Idempotency-Key` header yet.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
