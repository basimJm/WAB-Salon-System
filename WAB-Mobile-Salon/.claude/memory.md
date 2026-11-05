# WAB-Mobile-Salon memory (loaded with this folder: keep short; details in `docs/knowledge/facts.md`)

- Gradle, adb and `simctl` run only from the Terminal panel. With `-q` Kotlin warnings are hidden, so grep `^w:` from a non-quiet run.
- Dev package `com.fab.wab.merchant.dev`. Demo logins: `WAB-Server/docs/DEMO_ACCOUNTS.md`, OTP from the local stack.
- iOS: never call a suspend function inside the argument list of an Objective-C call (MER-067).
- `BackHandler` is deprecated: use `NavigationBackHandler`.
