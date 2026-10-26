# wab-otp — Memory (durable facts; keep short, replace instead of append)

> No code yet (2026-10-18). Loaded on every turn while working in this folder: keep it to facts that save a future session an investigation (decisions, paths, commands, gotchas). Nothing that the code, git history or the backlog already records.

## Facts

- Backlog written 2026-10-18; first task via `python3 scripts/tasks.py next <project>`. Copy the `wab-notifications` tooling (SDKs) or the customer template (merchant app).
- 0.2.0 (OTP-011): WhatsApp Cloud API code channel + signed single-use `otpToken`; Firebase/jose removed. The redacting logger hides any log key containing `code`/`token`/`key` — log error codes under `error`. Redis tests and the loop test need a local port: run `npm run verify` through the Terminal panel.
- 0.3.0 (OTP-012): ARQAM OTP channel (`adapters/arqam`, generic HTTP in `adapters/http`); the Meta WhatsApp channel is gone. ARQAM accepts 4–6 digit `otpCode` only. Vendor wait hints go in `OtpError.details.retryAfterMs` (`withRetry` honours them). Owner guide: `docs/ARQAM_SETUP.md`.
