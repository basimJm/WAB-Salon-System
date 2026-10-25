import FirebaseAppCheck
import FirebaseAuth
import FirebaseCore

/// Configures Firebase only when `GoogleService-Info.plist` carries a real API key.
/// Placeholder keys (owner input still pending) make Firebase Installations throw at launch, so the app then runs
/// without Firebase: no bridges are registered and the Kotlin side falls back to its no-op behaviour, as on Android.
enum FirebaseSetup {
    /// Length Firebase requires for an iOS API key (`I-FIS008000`).
    private static let apiKeyLength = 39

    static func configureIfValid() -> Bool {
        guard let options = FirebaseOptions.defaultOptions(),
              let apiKey = options.apiKey,
              apiKey.count == apiKeyLength else {
            PhoneAuthLog.info("Firebase NOT configured (missing or placeholder GoogleService-Info.plist) — no SMS can be sent")
            return false
        }
        // App Check must be installed before Firebase starts (protects Auth / Phone Auth).
        AppCheck.setAppCheckProviderFactory(MerchantAppCheckProviderFactory())
        FirebaseApp.configure(options: options)
        AppCheck.appCheck().token(forcingRefresh: false) { token, error in
            if let error {
                PhoneAuthLog.info("appCheck token FAILED: \(error.localizedDescription)")
            } else {
                PhoneAuthLog.info("appCheck token OK (\(token == nil ? "empty" : "present"))")
            }
        }
        return true
    }

    /// Phone Auth reCAPTCHA fallback returns through a URL; Firebase consumes it when it is its own.
    static func handleAuthURL(_ url: URL) -> Bool {
        guard FirebaseApp.app() != nil else { return false }
        return Auth.auth().canHandle(url)
    }
}
