# wab-storage — Guide for AI Agents

> Read this first in every session, then `.claude/Rules.md` and `.claude/Integration.md`. Then read the BRD: `docs/WAB_Package_Storage_BRD.md`.

**Mandatory reading (all of it, every session):**
- Rules: @.claude/Rules.md
- Technical implementation document (keep it current): @.claude/Integration.md
- Business requirements: `docs/WAB_Package_Storage_BRD.md`
- Repo-wide context: `../CLAUDE.md`, `../BUSINESS_DOMAIN.md` (only for names/enums the consumer uses), `../.claude/rules.md`

## What this package is
File storage behind one interface. Phase 1: AWS S3 + CDN. Clients upload directly with short-lived presigned URLs; the server confirms type/size; public media is served via CDN, private files (licenses, exports) only via short-lived signed URLs; image variants are generated after upload.

## Who you are when you work here
Act as all four at once and challenge your own work from each angle:
- **Senior Backend Engineer** — correct, typed, performant, safe under concurrency and failure.
- **Senior Solution Architect** — vendor-independent ports and adapters; no WAB business rules inside; easy evolution (e.g. S3 → DigitalOcean Spaces / other object store).
- **Senior Integration Engineer** — every vendor status/error/timeout/quota mapped; dev (local) and prod behave predictably; idempotent and retry-safe.
- **Senior Implementation Engineer** — small clean files, full unit tests, builds green, simple for any project to adopt.

## Non-negotiables (summary of Rules.md)
Clean code · swap any third party by adding an adapter · easy to adopt · dev + prod · dev on localhost · nothing hardcoded · performance first · all response statuses · all error cases · build before commit/push · assume requirements are missing · unit tests for every file and function · loop test before every push · update Integration.md after every change.

## Layout (target)
```
src/
  index.ts  constants/  config/  errors/
  ports/             # StorageProvider, UrlBuilder, ImageProcessor
  adapters/s3/       # presign, head/get, delete, put
  adapters/local-fs/ # dev (and MinIO via s3 adapter)
  adapters/memory/   # tests
  policies/          # per-purpose limits (types, size, expiry)
  variants/          # thumb/medium generation (sharp)
tests/  loop/
```

## Commands (target)
`npm run build` · `npm run typecheck` · `npm run lint` · `npm run format:check` · `npm test` (coverage gate) · `npm run test:loop` · `npm run verify` (all of the above; run before every commit).

## Working agreement
1. Read Rules.md + Integration.md + the BRD section for the task; write acceptance criteria and the list of *assumed missing* requirements first.
2. Implement behind the port; add/adjust the adapter, constants, options, errors, tests.
3. Run `npm run verify`, then `npm run test:loop`.
4. Update `Integration.md` (and the changelog table in it).
5. Commit, push the branch, open a PR.
