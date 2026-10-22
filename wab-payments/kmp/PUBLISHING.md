# Publishing the KMP library (private Maven)

Nothing is published by CI or by default. The owner runs the publish once a registry and token exist.

## Coordinates

| Artifact | Contents |
|---|---|
| `com.wab:payments` (+ `payments-android`, `payments-iosarm64`, `payments-iossimulatorarm64`, `payments-iosx64`) | ports (`PaymentLauncher`, `CheckoutSession`, `PaymentResult`...), fake and mock launchers, in-app browsers, framework `WabPayments` for iOS |
| `com.wab:payments-hyperpay-android` | `HyperPayAndroidBridge` over the HyperPay Android SDK (the vendor SDK stays `compileOnly`) |

Version: `wab.payments.version` in `gradle.properties` (semver; breaking changes only in a major).

## Publish (GitHub Packages assumed)

```
export WAB_MAVEN_USER=<github user>
export WAB_MAVEN_TOKEN=<token with write:packages>   # never committed
./gradlew publish \
  -Pwab.payments.maven.url=https://maven.pkg.github.com/<owner>/<repo> \
  -Pwab.payments.oppwa.version=<OPP SDK version> \
  -Pwab.payments.oppwa.repository=<OPP SDK maven repository>
```

The iOS targets must be published from macOS (Kotlin/Native). `./gradlew publishToMavenLocal` works without any registry.

## Consuming it (customer app)

`settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        maven {
            url = uri("https://maven.pkg.github.com/<owner>/<repo>")
            credentials { username = providers.environmentVariable("WAB_MAVEN_USER").orNull; password = providers.environmentVariable("WAB_MAVEN_TOKEN").orNull }
        }
    }
}
```

`gradle/libs.versions.toml`: `wab-payments = "0.1.0"`, `wab-payments = { module = "com.wab:payments", version.ref = "wab-payments" }`, `wab-payments-hyperpay-android = { module = "com.wab:payments-hyperpay-android", version.ref = "wab-payments" }`.

Until the artifact exists, the customer tasks CUS-047 / CUS-062 can include the `kmp/` build with `includeBuild("../wab-payments/kmp")` and the same coordinates.

## Before the first publish

- [ ] Registry and token (owner), OPP SDK version and repository (owner).
- [ ] `./gradlew :payments:allTests` on CI/macOS (the JVM-only harness used in the sandbox covers `commonMain` and `commonTest` only).
- [ ] `./gradlew :payments-hyperpay-android:assembleRelease` with the OPP SDK resolvable.
- [ ] Sandbox payment on a real Android and iOS device (see `docs/android.md`, `docs/ios.md`).
