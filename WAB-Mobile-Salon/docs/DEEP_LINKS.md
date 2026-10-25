# Merchant deep links — App Links / Universal Links checklist (MER-053)

PRD §4.5: "Register your salon with us" in the customer app opens `<merchant-domain>/register` in this app when it is
installed, otherwise the store page. The merchant domain is an **owner input** (root `CLAUDE.md` §6, PRD §16 #11);
everything below is configuration only, no code change.

## Paths the app routes (`composeApp/.../app/deeplink/MerchantDeepLinks.kt`)
| Path | Guest | Signed-in member |
|---|---|---|
| `/register` | Login in registration mode → phone → OTP (REGISTER) → salon registration (M04) | ignored (one phone = one salon) |
| `/bookings/<id>` | ignored | booking details (M09), home route only |
Any other path, or a link of another host, is dropped (`DeepLinks.parse` checks the host against `WEB_BASE_URL`).

## 1. Domain per environment (owner)
- [ ] `DEV_WEB_BASE_URL` / `PROD_WEB_BASE_URL` in `gradle.properties` (Android manifest host `DEEP_LINK_HOST` is derived from it).
- [ ] `WEB_BASE_URL` and `DEEP_LINK_HOST` in `iosApp/Configuration/{Dev,Prod}.xcconfig` (prod is still the template placeholder).

## 2. Android App Links
- [ ] Serve `https://<domain>/.well-known/assetlinks.json` (HTTPS, no redirect, `application/json`) with
      `delegate_permission/common.handle_all_urls` for package `com.fab.wab.merchant` (prod) and `com.fab.wab.merchant.dev` (dev),
      each with the SHA-256 fingerprints of the upload key **and** the Play app-signing key.
- [ ] The manifest already declares `autoVerify="true"` for `https://${DEEP_LINK_HOST}/` (`androidApp/src/main/AndroidManifest.xml`).
- [ ] Verify: `adb shell pm verify-app-links --re-verify com.fab.wab.merchant.dev`, then `adb shell pm get-app-links com.fab.wab.merchant.dev` shows `verified`;
      `adb shell am start -a android.intent.action.VIEW -d https://<domain>/register` opens the registration login.

## 3. iOS Universal Links
- [ ] Serve `https://<domain>/.well-known/apple-app-site-association` (no extension, `application/json`) with `applinks.details`
      for `<TeamID>.<bundle id>` of each environment and the components `/register` and `/bookings/*`.
- [ ] `iosApp/iosApp/iosApp.entitlements` already lists `applinks:$(DEEP_LINK_HOST)`; enable Associated Domains on the App IDs (owner, store accounts).
- [ ] Verify on a device / simulator: `xcrun simctl openurl booted https://<domain>/register`.

## 4. Customer app (CUS-056)
- [ ] The customer "Register your salon" button opens `https://<merchant-domain>/register`; when the merchant app is not
      installed the website page redirects to the App Store / Play Store listing (store links = owner input).
