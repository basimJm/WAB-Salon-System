# Changelog (KMP library)

## 0.1.0

- Ports: `PaymentLauncher` (alias `CheckoutLauncher`), `CheckoutSession`, `PaymentResult`, typed `PaymentError`.
- `DelegatingPaymentLauncher` (by provider), `FakePaymentLauncher`, `MockGatewayLauncher` (dev) with Android WebView and iOS `ASWebAuthenticationSession` browsers.
- `NativeCheckoutBridge` + `NativeCheckoutLauncher`, shared `sdkOutcome` mapping, `ShopperResult` URL parsing, card-number redaction.
- `payments-hyperpay-android`: HyperPay Android bridge. iOS: Swift reference bridge and `hyperPayIosLauncher`.
