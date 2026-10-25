import FirebaseAppCheck
import FirebaseCore

/// App Check provider: App Attest on real devices (DeviceCheck before iOS 14), the debug provider on the
/// simulator and in Debug builds. The debug token is printed in the Xcode console
/// ("Firebase App Check debug token") and must be added in Firebase → App Check → Manage debug tokens.
final class MerchantAppCheckProviderFactory: NSObject, AppCheckProviderFactory {
    func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
        #if targetEnvironment(simulator) || DEBUG
        return AppCheckDebugProvider(app: app)
        #else
        if #available(iOS 14.0, *) {
            return AppAttestProvider(app: app)
        }
        return DeviceCheckProvider(app: app)
        #endif
    }
}
