# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

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

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
