import FirebaseAuth
import Foundation

/// Console trail of every Firebase Phone Auth step (prefix `Merchant-PhoneAuth`). Numbers are masked; codes and tokens never logged.
enum PhoneAuthLog {
    private static let tag = "Merchant-PhoneAuth"
    private static let visiblePrefix = 4
    private static let visibleSuffix = 3

    static func mask(_ phone: String) -> String {
        guard phone.count > visiblePrefix + visibleSuffix else { return phone }
        let hidden = String(repeating: "*", count: phone.count - visiblePrefix - visibleSuffix)
        return String(phone.prefix(visiblePrefix)) + hidden + String(phone.suffix(visibleSuffix))
    }

    static func info(_ message: String) {
        NSLog("%@ %@", tag, message)
    }

    static func failure(_ step: String, _ error: NSError) {
        let name = AuthErrorCode(rawValue: error.code).map { "\($0)" } ?? "unknown"
        NSLog("%@ %@ FAILED code=%d (%@) domain=%@ message=%@", tag, step, error.code, name, error.domain, error.localizedDescription)
    }
}
