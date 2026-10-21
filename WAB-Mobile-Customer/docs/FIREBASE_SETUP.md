# Firebase setup — dev and prod

Two Firebase projects, one per environment. Dev installs next to prod on the same phone.

| Build | Android applicationId | iOS bundle ID | Firebase project |
|---|---|---|---|
| Dev | `com.fab.wab.customer.dev` | `com.fab.wab.customer.dev` | `wab-dev-397ab` |
| Prod | `com.fab.wab.customer` | `com.fab.wab.customer` | `wab-prod-9c58f` |

The ids come from `DEV_APPLICATION_ID_SUFFIX=.dev` (`gradle.properties`) and `BUNDLE_ID_SUFFIX = .dev` (`iosApp/Configuration/Dev.xcconfig`).

## Steps in the Firebase console (owner)
1. **Dev project `wab-dev-397ab`**
   - Add an Android app with package `com.fab.wab.customer.dev`. Add the **debug** SHA-1 and SHA-256 (`./gradlew :androidApp:signingReport`, variant `devDebug`); phone auth needs them.
   - Add an iOS app with bundle ID `com.fab.wab.customer.dev`.
   - Cloud Messaging → Apple app configuration: upload the APNs auth key (.p8, key id, team id).
2. **Prod project `wab-prod-9c58f`**
   - Android app `com.fab.wab.customer` with the **release** and **Play App Signing** SHA-1 / SHA-256.
   - iOS app `com.fab.wab.customer`; upload the same APNs key.
3. In both projects enable Authentication → Phone, Analytics, Crashlytics and Cloud Messaging.
4. **App Check** (both projects): register the Android app with **Play Integrity** (link the Google Cloud project in Play Console → App integrity) and the iOS app with **App Attest** (and DeviceCheck: upload the DeviceCheck key). Add the debug tokens printed by debug builds (Android Logcat tag `DebugAppCheckProvider`; Xcode console "App Check debug token") under App Check → Manage debug tokens. Turn on **Enforce** for Authentication only after the monitoring view shows verified requests from both apps.
5. Apple Developer: enable the **App Attest** capability on both App IDs (`com.fab.wab.customer.dev`, `com.fab.wab.customer`); the entitlement environment comes from `APP_ATTEST_ENVIRONMENT` in the xcconfigs.
6. Download the four files and replace the placeholders:

| File | Path |
|---|---|
| Dev `google-services.json` | `androidApp/src/dev/google-services.json` |
| Prod `google-services.json` | `androidApp/src/prod/google-services.json` |
| Dev `GoogleService-Info.plist` | `iosApp/Firebase/dev/GoogleService-Info.plist` |
| Prod `GoogleService-Info.plist` | `iosApp/Firebase/prod/GoogleService-Info.plist` |

## What is already wired in the app
| Feature | Android | iOS |
|---|---|---|
| Phone OTP (Firebase Auth) | `AndroidPhoneAuthGateway` (core/firebase) | `SwiftPhoneAuthBridge`; URL scheme (encoded app id + reversed client id) added at build time by `iosApp/scripts/firebase_config.sh`; returning URLs passed to `Auth.auth().canHandle` |
| Analytics | `AndroidFirebaseServices` | `SwiftAnalyticsBridge` |
| Crashlytics | Crashlytics Gradle plugin (R8 mapping upload on release) | `SwiftCrashReporterBridge`; dSYM upload phase `iosApp/scripts/crashlytics_upload.sh` (skipped while the config is a placeholder) |
| Push (FCM) | `MyFirebaseMessagingService` | `AppDelegate` + APNs |
| App Check | Play Integrity in release (`src/release/.../AppCheckSetup.kt`), debug provider in debug builds | App Attest (DeviceCheck before iOS 14) on devices, debug provider on simulator / Debug (`AppCheckSetup.swift`) |
| Resend code | Firebase resend token reused for the same number | handled by the Firebase SDK |

## How the app picks the file
- **Android**: the Google Services plugin reads `src/<flavor>/google-services.json` for the `dev` / `prod` flavor.
- **iOS**: the "Copy Firebase Config" build phase copies `iosApp/Firebase/$(APP_ENV)/GoogleService-Info.plist` into the app bundle (`APP_ENV` = `dev` / `prod` from the xcconfig).
- Until real files are in place, iOS starts without Firebase (`FirebaseSetup.configureIfValid`, CUS-070) and Android catches the Firebase setup errors; push, phone OTP, Analytics and Crashlytics stay off.

## Check after adding the real files
- Build `devDebug` and `prodDebug`; both install side by side.
- Dev: request an OTP on a real phone number and send a test push from the dev console.

## Troubleshooting a missing SMS
Android: `adb logcat -s WAB-PhoneAuth` · iOS: Xcode console, filter `WAB-PhoneAuth`.
| Log line | Meaning |
|---|---|
| `appCheck token FAILED` | debug token not registered / Play Integrity or App Attest not set up |
| `verifyPhoneNumber FAILED errorCode=ERROR_OPERATION_NOT_ALLOWED` | Phone provider disabled, or SMS region policy blocks the country |
| `… ERROR_QUOTA_EXCEEDED` / `TooManyRequests` | daily SMS quota or abuse protection hit |
| `… ERROR_INVALID_APP_CREDENTIAL` / `MISSING_CLIENT_IDENTIFIER` | SHA keys / reCAPTCHA / App Check problem |
| `codeSent` | Firebase accepted and sent the SMS; non-delivery is on the carrier side (Authentication → Usage, try another SIM) |
| `autoRetrievalTimeout` | this device did not read the SMS itself; normal on an emulator |
