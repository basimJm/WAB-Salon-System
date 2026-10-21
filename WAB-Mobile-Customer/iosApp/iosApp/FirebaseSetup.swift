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
            NSLog("WAB: Firebase not configured (missing or placeholder GoogleService-Info.plist)")
            return false
        }
        // App Check must be installed before Firebase starts (protects Auth / Phone Auth).
        AppCheck.setAppCheckProviderFactory(WABAppCheckProviderFactory())
        FirebaseApp.configure(options: options)
        return true
    }

    /// Phone Auth reCAPTCHA fallback returns through a URL; Firebase consumes it when it is its own.
    static func handleAuthURL(_ url: URL) -> Bool {
        guard FirebaseApp.app() != nil else { return false }
        return Auth.auth().canHandle(url)
    }
}
