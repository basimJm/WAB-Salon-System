# WAB-Mobile-Customer memory (loaded with this folder: keep short; details in `docs/knowledge/facts.md`)

- Gradle and adb run only from the Terminal panel: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk"`.
- Dev package `com.fab.wab.customer.dev`. Local stack on the emulator: `DEV_API_BASE_URL=http://10.0.2.2:4000` in `local.properties`, the untracked `androidApp/src/devDebug/AndroidManifest.xml` (never commit it; never `git add -A` here), `adb reverse tcp:9000 tcp:9000`.
- Host tests: `./gradlew testAndroidHostTest --offline`. Detekt: `sh scripts/ci/run_detekt.sh`.
- Strings: AR + EN in `composeResources`, each new one imported by name.
