# ADR-001 — Sharing `core/*` between the customer and merchant apps

- Status: Accepted for now (owner decides the long-term model later — open decision "shared `core/*` between the two KMP apps")
- Date: 2026-10-22 (MER-001)

## Context
The merchant app needs the same foundation as the customer app: convention plugins, `core/*` (design system with Liquid
Glass, MVI, network + auth refresh, mock engine, storage, session, security, realtime, analytics, Firebase ports,
notifications, navigation, DI), the Android/iOS hosts and the CI policies.

## Decision
**Copy now** with the `KMP_TEMPLATE` tool (`.claude/tools/KMP_TEMPLATE`): it generates the project from the live customer
app, removes the customer business (salons, bookings, catalog, gender, …) and renames the package to
`com.fab.wab.merchant`, the API prefix to `/merchant/v1` and the Socket.IO namespace to `/merchant`.
Each app owns its copy of `core/*` and evolves it through its own backlog.

## Options for later
1. **Shared Gradle included build** (`WAB-Mobile-Core/` with `core/*` + `build-logic`, `includeBuild` from both apps):
   one source, both apps rebuild on change; needs a neutral package (`com.fab.wab.core`) and coordinated releases.
2. **Published KMP artifacts** (GitHub Packages): versioned `core` modules; slower iteration, clean boundaries.
3. **Keep copies** and port improvements with the generator (regenerate a scratch project and diff).

## Consequences
- Fixes in one app's `core` do not reach the other automatically; port them deliberately (note it in both task blocks).
- The tool tests fail when the customer core changes in a way the generator does not expect, so the template stays usable.
