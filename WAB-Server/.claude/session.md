# WAB-Server: current task

> Only the task in progress lives here. When it merges, move its block to `docs/knowledge/session-archive.md`.

No task in progress.

### SRV-189 — "Open now" search filter (BUSINESS_DOMAIN §5.17, found by T-153): `GET /customer/v1/salons?openNow=true` matches a business when any bookable branch is open now in Asia/Amman; contract bump
- Branch: `feat/srv-189-open-now`
- Status: IN REVIEW
- Tasks: SRV-189; packet `features/open-now/PACKET.md`
- Acceptance criteria:
  - [x] `openNow=true` returns a business with at least one bookable branch open now in Asia/Amman and leaves out a business whose bookable branches are all closed (outside hours, day off or closure)
  - [x] A branch that is open but not bookable does not make its business match
  - [x] `openNow=false` or no parameter returns what it returned before
  - [x] The filter applies before paging, so page contents and totals count only matching businesses, and it combines with the other filters
  - [x] A non-boolean `openNow` gets the usual validation error
  - [x] OpenAPI and contract version regenerated and bumped for the customer namespace, naming CUS-110
  - [x] Unit tests cover each case above
- Tests: `scripts/qa.py server` green (branch: tests changed, stayed in the module, verify, contract matches the code)
- Loops: 1/1 — QA re-ran after the last change; the reviewer checked each criterion
- Review: PASSED (one reviewer through the four roles, model sonnet) — The openNow filter, validation, contract bump (CUS-110), and regenerated OpenAPI doc all match the acceptance criteria, each covered by a dedicated unit test with no gaps found.
- Notes: the line opened no browser, emulator or simulator and ran no iOS build; rules 3.11 and 3.13 keep those for the owner's batch
