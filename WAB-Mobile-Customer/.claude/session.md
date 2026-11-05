# WAB-Mobile-Customer: current task

> Only the task in progress lives here. When it merges, move its block to `docs/knowledge/session-archive.md`.

No task in progress.

### CUS-110 — "Open now" chip uses the server filter instead of filtering the loaded pages (BUSINESS_DOMAIN §5.17; S04)
- Branch: `fix/cus-110-open-now`
- Status: IN REVIEW
- Tasks: CUS-110; packet `features/open-now/PACKET.md`
- Acceptance criteria:
  - [x] Generated DTOs and the API client carry `openNow` from `scripts/api_sync.py`; generated files are not edited by hand
  - [x] Turning the chip on sends `openNow=true` and reloads from page 1; turning it off drops the parameter and reloads
  - [x] No filtering of loaded pages by open state remains in the search flow
  - [x] The active-filter chip with its × still removes the filter, and the filter combines with the others
  - [x] The dev mock data source honours `openNow`, so dev debug behaves like the server
  - [x] Unit tests cover the request built for on and off, and that results are not filtered on the device
- Tests: `scripts/qa.py customer` green (branch: tests changed, stayed in the module, local checks (Android))
- Loops: 1/1 — QA re-ran after the last change; the reviewer checked each criterion
- Review: PASSED (one reviewer through the four roles, model sonnet) — openNow now travels to the server (on sends true/reloads page 1, off drops it/reloads), on-device filtering is fully removed, the mock engine mirrors server filtering, and unit tests cover the on/off request plus the chip-driven reload, all backed by the already-synced generated contract.
- Notes: the line opened no browser, emulator or simulator and ran no iOS build; rules 3.11 and 3.13 keep those for the owner's batch
