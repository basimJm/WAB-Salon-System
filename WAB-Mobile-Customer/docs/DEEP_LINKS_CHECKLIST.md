# Deep links — owner checklist (CUS-057, PRD §4.4)

The app opens `https://<web host>/salon/{salonId}` as an Android App Link / iOS Universal Link. The host is the one
configured as `DEV_WEB_BASE_URL` / `PROD_WEB_BASE_URL` (`gradle.properties`) and `WEB_BASE_URL` + `DEEP_LINK_HOST`
(`iosApp/Configuration/<Env>.xcconfig`); the code never hardcodes it. Until the platform domain is decided the hosts are
placeholders, so verification cannot succeed yet.

## What the owner must publish on the website (both environments)
1. `https://<host>/.well-known/assetlinks.json` (Android), served as `application/json`, no redirect:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.fab.wab.customer",
       "sha256_cert_fingerprints": ["<upload-key SHA-256>", "<Play App Signing SHA-256>"]
     }
   }]
   ```
   Dev builds with an application id suffix need their own entry (`DEV_APPLICATION_ID_SUFFIX`). Fingerprints:
   `keytool -list -v -keystore <keystore> | grep SHA256`, plus the one shown in Play Console → App signing.
2. `https://<host>/.well-known/apple-app-site-association` (iOS), served as `application/json`, no redirect:
   ```json
   { "applinks": { "details": [ { "appIDs": ["<TEAM_ID>.com.fab.wab.customer"], "components": [ { "/": "/salon/*" } ] } ] } }
   ```
   The bundle id follows `PRODUCT_BUNDLE_IDENTIFIER` (`com.fab.wab.customer` + `BUNDLE_ID_SUFFIX`).
3. The salon share page at `/salon/{salonId}` must exist on the website (fallback for devices without the app).

## What is already in the app
- Android: `MainActivity` intent filter (`autoVerify`, `https://${DEEP_LINK_HOST}/salon/…`), host injected per flavor by
  `AndroidAppPlugin`; `onCreate` / `onNewIntent` publish the URL to `DeepLinkStore`.
- iOS: `com.apple.developer.associated-domains` = `applinks:$(DEEP_LINK_HOST)`; `iOSApp.swift` forwards `onOpenURL` and
  `NSUserActivityTypeBrowsingWeb` to `handleDeepLink`. The entitlement requires the Associated Domains capability on the
  App ID (Apple Developer portal) once the team id and bundle id are final.
- Shared: `DeepLinks.parse` accepts only the platform host and `/salon/{id}`; `DeepLinkEffect` routes once the NavHost is
  on screen (after onboarding / S02), opens Home then Salon Details; a missing or hidden salon shows "Salon not available"
  on Home (`SalonDetailsContract.SideEffect.NotAvailable`).

## Verifying
- Android: `adb shell pm verify-app-links --re-verify com.fab.wab.customer` then `adb shell pm get-app-links com.fab.wab.customer`;
  manual test `adb shell am start -a android.intent.action.VIEW -d "https://<host>/salon/<id>"`.
- iOS: Settings → Developer → Universal Links diagnostics, or `swcutil` logs in Console; paste the link in Notes and long-press.
