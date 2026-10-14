# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-055 — ADM-020 Media kit: ImageUploader, DocumentViewer, PhonePreview

- Project: `WAB-Admin-Dashboard/` (`components/media/*`, `hooks/useImageUpload.ts`, `domain/shared/upload.ts`, `utils/{mediaMath,safeHref}.ts`, `constants/media.ts`, `locales/*/media.json`, gallery `MediaSection`, tests `media-logic`, `media`, `e2e/media.spec.ts`)
- Branch: `feat/adm-020-media-kit`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-020; UI only, the real presign/confirm calls are wired in the banners task):
  - [x] `ImageUploader` + `LocalizedImageUploader` (Arabic and English): file checked before upload (type, size, empty), progress 0..1, preview, replace/remove, failure kept for retry, drag and drop, disabled state; the upload round trip is an injected function
  - [x] `DocumentViewer`: zoom 50-300%, rotate both ways, download with `rel=noopener`, PDFs via `<object>`; only https signed URLs or local `blob:` previews are shown (http, javascript:, data: refused)
  - [x] `PhonePreview`: frame with its own `lang`/`dir`, so an Arabic and an English preview sit side by side on any page direction
  - [x] AR + EN strings (new `media` area), tokens only, gallery section with a fake upload (a file named "fail" simulates a failure)
- Tests: `sh scripts/gate.sh` all PASS; e2e 92/92 on the real Chrome (desktop, Pixel portrait/landscape, tablet) incl. `e2e/media.spec.ts` with real file inputs
- Browser check: built dev-debug in the built-in browser: upload progress 0.4 mid-way then preview, phone previews rtl/ltr inside the viewport, no overflow, console clean
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — the quiet gate surfaced a lint rule (complexity) and a hardcoded rem that were fixed (state machine moved to `useImageUpload`, size to a token).
- Notes: Keyboard shortcuts on the viewer were dropped (lint rules forbid handlers on static regions); every action is a toolbar button.

### T-056 — ADM-021 RichTextEditor (ar/en tabs) and SchedulePicker

- Project: `WAB-Admin-Dashboard/` (`infrastructure/richText/{sanitize,markdown}.ts`, `constants/richText.ts`, `utils/{textFormat,htmlToReact}`, `components/form/{RichTextEditor,LocalizedRichTextEditor,SchedulePicker}`, `docs/adr/0006-rich-text.md`, gallery `RichTextSection`, tests `rich-text`, `rich-text-ui`, `e2e/richtext.spec.ts`)
- Branch: `feat/adm-021-rich-text`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-021: Arabic/English tabs, sanitized HTML output, RTL aware; SchedulePicker end after start; library choice as an ADR):
  - [x] ADR-0006: Markdown-subset editor emitting sanitized HTML. DECISION TO CONFIRM: differs from Appendix C (Tiptap) because Tiptap (~70 KB gzip) does not fit the 200 KB budget (~27 KB headroom) and `execCommand` is deprecated
  - [x] Allow-list sanitizer (`p h2 h3 ul ol li strong em a br`, links https/http/mailto only, forced rel/target, scripts/styles/frames dropped with content), Markdown <-> HTML for the subset, toolbar transforms (bold, italic, headings, lists, link) as pure functions; preview built as React elements (no `dangerouslySetInnerHTML`, project XSS rule)
  - [x] Arabic and English tabs, each with its own direction/lang; value replaced from outside is shown without losing typing
  - [x] `SchedulePicker`: each date limits the other (end >= start + 1 day), order error shown, form errors passed through
- Tests: `sh scripts/gate.sh` all PASS; e2e 100/100 on the real Chrome (desktop, Pixel portrait/landscape, tablet)
- Browser check: built dev-debug in the built-in browser: Arabic editor rtl, malicious link/script input stays inert text, preview inside the viewport, console clean
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — lint blocked `dangerouslySetInnerHTML` (good); e2e found Ctrl+A is not select-all on macOS (use `selectText()`).
- Notes: Existing server HTML outside the allow-list is flattened to text when a page is opened for edit (documented in ADR-0006).

### T-057 — ADM-022 Shell design completion

- Project: `WAB-Admin-Dashboard/` (`constants/nav.ts` tree + `NAV_PAGES`, `layout/{Sidebar,Topbar,AppShell}`, `components/layout/{Breadcrumbs,GlobalSearch}`, `controllers/useBreadcrumbs`, `components/feedback/StatusPage`, `pages/{Forbidden,ServerError,NotFound}Page`, routes `/forbidden` `/error`, gallery `ShellSection`, tests `shell`, `e2e/shell.spec.ts`)
- Branch: `feat/adm-022-shell-design`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-022; PRD §6 sidebar, §2 top bar):
  - [x] Sidebar sub-menus for Analytics (9), Salons (2), Finance (5), Catalog (2), Content (5); the group of the current page is open, toggles by hand, hidden when the sidebar is collapsed; every sub-page has a (placeholder) route
  - [x] Counter slots by nav id (`counters` prop; sub-page value, module shows the sum, `99+`, Arabic digits, nothing for 0); live data is attached by the shell-live task
  - [x] Breadcrumbs from the nav tree (Module > Sub-page, hidden on module pages)
  - [x] `GlobalSearch` UI: 2+ characters, 500 ms debounce, results grouped (customers, salons, bookings, members), arrows/Enter/Escape, loading, empty and error lines; shown in the top bar only when a `search` source is given (global-search task)
  - [x] Admin menu (About this build, Sign out) replaces the name + button; 403 and 500 pages next to the 404, one `StatusPage` layout
- Tests: `sh scripts/gate.sh` all PASS (700 unit tests); e2e 108/108 on the real Chrome (desktop, Pixel portrait/landscape, tablet)
- Browser check: built dev-debug in the built-in browser: breadcrumbs Finance > Refunds, Finance group open with 5 sub-pages and Refunds active (after expanding the collapsed sidebar), admin menu inside the viewport with About/Sign out, console clean
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — the browser check showed the saved "collapsed sidebar" preference hides groups by design (covered by a test).
- Notes: Search box is not in the live top bar yet (no data source: SRV gap G2 global search); counters are empty until live data exists.

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

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
