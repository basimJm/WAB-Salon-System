# WAB memory (loaded every session: keep short; details in `docs/knowledge/facts.md`)

- The sandbox cannot write `.claude/hooks`, `.claude/skills`, `.claude/settings.json` or `.git/config`, and has no network or local ports: `gh`, `git fetch/push`, Gradle, adb and anything on localhost run through the Terminal panel. System `python3` is 3.9.
- Owner grant: after the local gate, push, open the PR into the master and merge it. Masters → `main` → masters only when the owner asks; finish with a fast-forward so all stay level.
- Owner cares about token cost: small contexts, one agent at a time, no re-reading. Numbers: `python3 scripts/usage.py`.
- Never `source` an env file: a multi-line value printed a private key into the terminal once.
