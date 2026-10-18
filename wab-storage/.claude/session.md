# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-007 — Image variants
- Branch: `feat/sto-007-variants`
- Status: IN REVIEW
- Acceptance criteria: thumb 320 / medium 960 WebP via sharp (lazy), EXIF rotated + stripped, never enlarged, keys beside the original (matches WAB-Server variants.ts), unreadable images skipped, ImageProcessor port
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — variant naming identical to the server (_thumb.webp/_medium.webp); createStorage now returns Storage = port + createVariants/variantKey(s); jest timeout raised for loaded runners
