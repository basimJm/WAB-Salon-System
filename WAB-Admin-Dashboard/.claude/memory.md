# WAB-Admin-Dashboard memory (loaded with this folder: keep short; details in `docs/knowledge/facts.md`)

- Local tooling: the sandbox blocks local ports and the npm cache is root-owned (`export NPM_CONFIG_CACHE=$TMPDIR/npm-cache`). Browser checks use real Chrome through the Terminal panel.
- Bundle budget is tight (dev-release entry ~79.9/80 KB): new strings go in lazy locale areas (`locales/lazy/<area>.ts`).
- Never filter gate output with grep: a failing step was hidden once.
