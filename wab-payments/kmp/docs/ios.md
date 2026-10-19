# iOS integration (HyperPay)

UNVERIFIED: not built in the CI sandbox (no macOS/Xcode, no OPPWAMobile framework).

1. Add the Kotlin framework (`WabPayments`, produced by `:payments` for iosArm64 / iosSimulatorArm64 / iosX64) and the owner's OPPWAMobile framework to the app target.
2. Copy `kmp/ios/HyperPayCheckoutBridge.swift` into the app, build, adjust renamed OPP symbols.
3. Register the URL scheme of `HYPERPAY_RETURN_URL` (for example `wab`) in `Info.plist` (`CFBundleURLTypes`) and forward incoming URLs: `if bridge.handleReturn(url: url) { return true }`.
4. Wire the launchers (Koin / manual):

```swift
let bridge = HyperPayCheckoutBridge()
let launcher = DelegatingPaymentLauncher(launchers: [
    "hyperpay": IosLaunchersKt.hyperPayIosLauncher(bridge: bridge),
    "mock-gateway": MockGatewayLauncher(browser: WebAuthInAppBrowser()),
    "fake": FakePaymentLauncher(outcome: .completed, failure: ...),
])
```

The mock gateway needs a custom-scheme return URL on iOS (`ASWebAuthenticationSession`).
Never log card data; the library scrubs card-like numbers from SDK errors it reports.
