# WAB-Mobile-Salon — Rules for AI Agents (merchant app)

> Adds to the root `CLAUDE.md` and `.claude/*.md`; never relaxes them. Until MER-003 writes the merchant-specific rules, **every rule of `WAB-Mobile-Customer/CLAUDE.md` applies here unchanged** (Clean Architecture + MVI by delegate, no hardcoding, AR + EN resources, 300-line files, all variants build, portrait + landscape, performance checklist, adaptive layout). PRD > BRD > Design Script > `design/*.dc.html`; conflicts → stop and ask.

**Auto-loaded with this file (never read them with a tool):**
- Session (current task, integration status): @.claude/session.md
- Memory (durable merchant-app facts): @.claude/memory.md

## 0. Per task (nothing else is read up front)
1. `python3 scripts/tasks.py next merchant` → the task row. Read only the Merchant PRD sections / screens (`docs/WAB_Merchant_App_PRD.md`, M01–M26) and the `openapi.merchant.json` operations it names, plus the matching `design/WAB Merchant 0x *.dc.html` for UI work.
2. `.claude/Integration.md` when the task touches the API, Firebase, realtime, push or the mock.
3. `BUSINESS_DOMAIN.md` sections the row names (permissions §, booking state machine, error codes §11).

## 1. Merchant specifics (on top of the customer rules)
1. **Permission-driven UI, hidden not disabled** (PRD §3, §6): every screen, tab, menu item, button and notification is gated through the permission helpers (MER-009); permissions refresh on app start, Home pull-to-refresh and the `PERMISSIONS_UPDATED` data push.
2. **Booking actions are conflict-safe:** every approve/reject/cancel/complete/no-show/reassign handles the "already handled by {member}" and schedule-conflict answers by refreshing, never by retrying blindly.
3. **Real-time requests** (PRD M10): socket event + FCM data message de-duplicated by booking id; Android overlay permission is requested with an explanation and never assumed; iOS uses time-sensitive actionable notifications.
4. **Branching:** `feat/mer-NNN-<key>` from the freshly fetched `origin/merchant`; PR into `merchant`; never `main`.
5. **Done:** acceptance criteria in `.claude/session.md`, unit tests, local checks + CI green, AR + EN, `Loops: 1/1`, four-role review, `tasks.py set MER-NNN DONE`, memory updated.
