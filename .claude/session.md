# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-073 — ADM-036 content FAQ and contact info

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-036-faq-contact`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-036):
  - [x] FAQ per app (AR+EN question/answer, order) and contact info (phone/WhatsApp E.164, email) lists with side-panel create/edit, validation and mandatory reason; drawer shell moved to shared components
- Tests: 9 new tests through the mock stack; browser check: FAQ and Contact pages load rows, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### T-074 — ADM-037 banners with image upload

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-037-banners`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-037):
  - [x] Banners list (gender filter) and full-width editor: Arabic and English artwork uploaded through presign + PUT + confirm, action (none/salon/https link) with value rules, audience, Amman-day schedule with included end day, order, active, phone previews, mandatory reason
- Tests: 17 new tests incl. upload flow through the mock stack; browser check: editor opens with 2 uploaders and 2 previews, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
