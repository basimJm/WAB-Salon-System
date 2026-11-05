# WAB-Server memory (loaded with this folder: keep short; details in `docs/knowledge/facts.md`)

- Local stack: `sh ../WAB-Admin-Dashboard/qa/stack.sh` (Mongo 27018, Redis 6380, MinIO 9000, API 4000). The Terminal panel only.
- Local API on the shared dev database: the server reads `.env.development` itself. Its `OTP_PROVIDER`, Redis URL and AWS keys are stale; override them in the environment. Never source the file.
- Never `storage.delete` from a module: queue with `StorageCleanup.enqueue`. New Mongoose model: add it to `ALL_MODELS`.
- Check `ls tests/<name>.test.ts` before writing a test file.
