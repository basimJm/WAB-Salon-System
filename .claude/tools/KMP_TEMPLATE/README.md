# KMP_TEMPLATE

Creates a new Kotlin Multiplatform app (Android + iOS, Compose Multiplatform) with the same setup as the WAB
customer app (`WAB-Mobile-Customer`), in any folder.

```bash
/Users/basimabusnaimeh/WAB/.claude/tools/KMP_TEMPLATE/KMP_TEMPLATE          # interactive
/Users/basimabusnaimeh/WAB/.claude/tools/KMP_TEMPLATE/KMP_TEMPLATE --help   # flags
```

It asks (Enter keeps the default; optional answers can be skipped):

| Question | Default |
|---|---|
| App name (under the icon), Arabic app name | required / same as the app name |
| Package name = Android applicationId = iOS bundle id | `com.example.<name>` |
| Project name (Gradle root project, iOS product, Swift prefixes) | from the app name |
| Target folder (must not exist) | `./<ProjectName>` |
| Dev id suffix (dev and prod install side by side) | `.dev` |
| Dev / prod API base URL, dev / prod web URL (deep links) | `example.com` placeholders |
| API path prefix, realtime (Socket.IO) namespace | `/api/v1`, `/app` |
| Dev data source (`mock` = fixtures each feature binds, `remote` = dev API) | `mock` |
| Apple Team ID | keep the template's |
| Firebase Android dev + prod `google-services.json`, iOS dev + prod `GoogleService-Info.plist` | skip → placeholders |

Provided Firebase files are copied to `androidApp/src/{dev,prod}/` and `iosApp/Firebase/{dev,prod}/` and checked
against the expected ids (dev = package + suffix). Skipped ones get placeholders that build and run with Firebase off.
The WAB Firebase files are never copied.

`--merge` adds the project into an existing folder (e.g. one that already has `docs/` and `design/`): files the folder
already has are kept.

Non-interactive example:
```bash
KMP_TEMPLATE --yes --app-name "Acme Shop" --package com.acme.shop --target ~/Projects/AcmeShop \
  --dev-api-url https://api-dev.acme.io --prod-api-url https://api.acme.io \
  --firebase-android-dev ~/Downloads/dev/google-services.json --firebase-ios-dev ~/Downloads/dev/GoogleService-Info.plist
```

## What the new project gets
- **Same as the customer app (renamed, reusable only):** `build-logic` convention plugins, every `core/*` module (design
  system with Liquid Glass, MVI, network/Ktor + auth refresh, mock engine with per-feature fixtures, storage, session,
  security, realtime/Socket.IO, analytics, Firebase ports, notifications, navigation, DI), Android + iOS hosts, all SDKs
  and third parties (`gradle/libs.versions.toml`, SPM), App Check, Crashlytics, push, deep links, flavors/configurations,
  CI scripts, policy checks, detekt, the GitHub workflow.
- **Removed (WAB customer business):** salons, bookings, catalog, favorites, locations, gender, merchant hand-off, the WAB
  `/config` launch gate, the generated WAB API contract and fixtures, WAB-only error codes, salon/service cards, WAB routes,
  and the matching strings/tests (`genericize.py`; whole-file generic versions in `shell/`).
- **One feature:** `feature/sample` (domain, data, presentation, di): the pattern to copy for new features.
- **New:** a slim `composeApp` shell (theme, language/RTL, dark mode, notifications, push, deep links, analytics screen
  tracking, sample navigation), `README.md`, `CLAUDE.md` + `.claude/{rules,roles,session,memory}.md` (the WAB rules and
  roles without the customer/monorepo points), `BUSINESS_DOMAIN.md` (error codes for the policy check), `.gitignore`, `git init`.
- **Not copied:** WAB business features, WAB docs/design, `.claude` session files, build output, local signing files.

## How it works
`kmp_template.py` (prompts) → `generator.py` (copy, strip features, shell overlay from `shell/`) → `genericize.py` (remove the
WAB business, error codes, unused strings, neutral test data/comments) → `generator.py` (CI retargeting, API prefix, rename of
package/plugin ids/folders/names) → `configure.py` (URLs, names, Team ID, Firebase, policy baseline, docs from `files/`).
The template is always the current customer app, so improvements there reach every new project.

Tests: `python3 -m unittest discover -s .claude/tools/KMP_TEMPLATE -p 'test_*.py'` (includes a full generation).
Verified project gate: `scripts/ci/run_local_checks.sh` in a generated project (policy, detekt, unit tests, 4 Android
variants + lint, 4 iOS configurations).
