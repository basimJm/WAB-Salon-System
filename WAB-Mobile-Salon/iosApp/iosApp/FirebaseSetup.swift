import FirebaseCore
import Foundation

/// Configures Firebase (push, analytics, Crashlytics) only when `GoogleService-Info.plist` carries a real API key.
/// Placeholder keys (owner input still pending) make Firebase Installations throw at launch, so the app then runs
/// without Firebase: no bridges are registered and the Kotlin side falls back to its no-op behaviour, as on Android.
/// Phone OTP does not use Firebase: the backend sends WhatsApp codes (MER-070).
enum FirebaseSetup {
    /// Length Firebase requires for an iOS API key (`I-FIS008000`).
    private static let apiKeyLength = 39

    static func configureIfValid() -> Bool {
        guard let options = FirebaseOptions.defaultOptions(),
              let apiKey = options.apiKey,
              apiKey.count == apiKeyLength else {
            NSLog("Firebase NOT configured (missing or placeholder GoogleService-Info.plist): push, analytics and Crashlytics are off")
            return false
        }
        FirebaseApp.configure(options: options)
        return true
    }
}
