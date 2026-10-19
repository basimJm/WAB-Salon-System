# Android integration (HyperPay)

UNVERIFIED: written from the OPP documentation; not built in the CI sandbox (no access to Google Maven or the OPP SDK repository).

## 1. Dependencies (customer app)

```kotlin
// gradle.properties / local.properties (owner inputs, never committed with secrets)
// wab.payments.oppwa.version=<OPP SDK version>
// wab.payments.oppwa.repository=<OPP Maven repository URL>
implementation("com.wab:payments:<version>")                  // common ports, dev launchers
implementation("com.wab:payments-hyperpay-android:<version>") // HyperPay Android bridge
implementation("com.oppwa.mobile:oppwa.mobile:<OPP SDK version>") // vendor SDK (compileOnly in the bridge)
```

## 2. Manifest: return to the app after 3-D Secure

The scheme equals the scheme of `HYPERPAY_RETURN_URL` on the server (for example `wab://payment/result`).

```xml
<activity
    android:name="com.oppwa.mobile.connect.checkout.dialog.CheckoutActivity"
    android:launchMode="singleTask"
    tools:replace="android:launchMode"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="wab" android:host="payment" />
    </intent-filter>
</activity>
```

For the dev mock gateway over HTTP add a debug-only network security config that allows the mock host.

## 3. Wiring (Koin sketch)

```kotlin
val launcher = DelegatingPaymentLauncher(
    mapOf(
        "hyperpay" to NativeCheckoutLauncher(HyperPayAndroidBridge(context, ActivityResultRegistryHost(activity.activityResultRegistry))),
        "mock-gateway" to MockGatewayLauncher(WebViewInAppBrowser(context)),
        "fake" to FakePaymentLauncher(),
    ),
)
```

Never log the `CheckoutSession` fields other than ids; the library already scrubs card-like numbers from SDK errors.
