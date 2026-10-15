# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-072 — ADM-035 Content: legal pages

- Project: `WAB-Admin-Dashboard/` (`domain/content`, `data/content`, `presentation/content/{LegalPagesPage,PageEditor}.tsx`, mock `contentRoutes`, locales, route `/content/pages`)
- Branch: `feat/adm-035-content-pages`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-035; PRD A24 legal pages):
  - [x] List of Privacy / Terms / About pages per app (filter by app); create a missing page; edit opens a full-width editor with the Arabic and English rich text tabs (Markdown subset, sanitized HTML out) and live preview
  - [x] Both languages required (max 50,000 characters), mandatory reason, errors per language tab; app and kind fixed after creation; AR+EN; error state with retry
- Tests: `sh scripts/gate.sh` all PASS (4 new tests through the mock stack); browser check dev-debug: list loads, edit opens the editor with preview, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). ADR-0006 (Markdown subset instead of Tiptap) still awaits the owner's confirmation.
- Notes: ADM-036 adds FAQ and contact info to `ContentRepository`.

### T-073 — ADM-036 content FAQ and contact info

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-036-faq-contact`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-036):
  - [x] FAQ per app (AR+EN question/answer, order) and contact info (phone/WhatsApp E.164, email) lists with side-panel create/edit, validation and mandatory reason; drawer shell moved to shared components
- Tests: 9 new tests through the mock stack; browser check: FAQ and Contact pages load rows, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
