# wab-payments KMP library

Kotlin Multiplatform client side of `@wab/payments`: opens the gateway's payment UI on Android and iOS for a checkout the server created, and reports what the device saw. The server's verify call is always the source of truth.

```kotlin
val result = launcher.launch(session)          // PaymentLauncher
when (result) {
    is PaymentResult.ClientCompleted -> api.verify(result.sessionId)
    is PaymentResult.Cancelled -> backToSummary()
    is PaymentResult.Failed -> show(result.error)
}
```

- Ports and logic: `payments/src/commonMain` (unit-tested in `commonTest`).
- Android HyperPay: `payments-hyperpay-android`, guide `docs/android.md`.
- iOS HyperPay: Swift reference `ios/HyperPayCheckoutBridge.swift`, guide `docs/ios.md`.
- Dev without a gateway: `MockGatewayLauncher` against the local OPP mock (`npm run mock-gateway` in `..`).
- Publishing and consuming: `PUBLISHING.md`.

Local check without Android/Xcode: a JVM-only Gradle project compiling `commonMain` + `commonTest` (warnings as errors) runs all unit tests.
