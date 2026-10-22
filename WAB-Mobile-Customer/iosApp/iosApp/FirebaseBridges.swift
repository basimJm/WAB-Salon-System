import Foundation
import FirebaseAnalytics
import FirebaseAuth
import FirebaseCore
import FirebaseCrashlytics
import FirebaseMessaging
import ComposeApp

/// Swift side of `core/firebase`: the only place the app touches the Firebase iOS SDK beyond `FirebaseApp.configure()`.
enum FirebaseBridgeRegistration {
    static func register() {
        FirebaseBridges.shared.register(
            phoneAuth: SwiftPhoneAuthBridge(),
            pushToken: SwiftPushTokenBridge(),
            crashReporter: SwiftCrashReporterBridge(),
            analytics: SwiftAnalyticsBridge()
        )
    }
}

final class SwiftPhoneAuthBridge: PhoneAuthBridge {
    func startVerification(
        phoneE164: String,
        onCodeSent: @escaping (String) -> Void,
        onError: @escaping (KotlinInt, String?) -> Void
    ) {
        PhoneAuthLog.info("start phone=\(PhoneAuthLog.mask(phoneE164)) project=\(FirebaseApp.app()?.options.projectID ?? "none")")
        let startedAt = Date()
        PhoneAuthProvider.provider().verifyPhoneNumber(phoneE164, uiDelegate: nil) { verificationId, error in
            if let error = error as NSError? {
                PhoneAuthLog.failure("verifyPhoneNumber", error)
                onError(KotlinInt(int: Int32(error.code)), error.localizedDescription)
            } else if let verificationId {
                let ms = Int(Date().timeIntervalSince(startedAt) * 1000)
                PhoneAuthLog.info("codeSent verificationId=\(verificationId.prefix(8))… afterMs=\(ms) — Firebase handed the SMS to " +
                    "its carrier; if it never arrives check Authentication → Usage, SMS region policy, billing and test numbers")
                onCodeSent(verificationId)
            } else {
                PhoneAuthLog.info("verifyPhoneNumber returned neither id nor error")
                onError(KotlinInt(int: -1), nil)
            }
        }
    }

    func confirm(
        verificationId: String,
        code: String,
        onIdToken: @escaping (String) -> Void,
        onError: @escaping (KotlinInt, String?) -> Void
    ) {
        PhoneAuthLog.info("confirm verificationId=\(verificationId.prefix(8))… codeLength=\(code.count)")
        let credential = PhoneAuthProvider.provider().credential(withVerificationID: verificationId, verificationCode: code)
        Auth.auth().signIn(with: credential) { result, error in
            if let error = error as NSError? {
                PhoneAuthLog.failure("confirm", error)
                onError(KotlinInt(int: Int32(error.code)), error.localizedDescription)
                return
            }
            PhoneAuthLog.info("confirm OK uid=\(result?.user.uid.prefix(8) ?? "")…")
            result?.user.getIDToken { token, tokenError in
                if let token {
                    onIdToken(token)
                } else {
                    let nsError = tokenError as NSError?
                    onError(KotlinInt(int: Int32(nsError?.code ?? -1)), nsError?.localizedDescription)
                }
            }
        }
    }

    func signOut() {
        try? Auth.auth().signOut()
    }
}

final class SwiftPushTokenBridge: PushTokenBridge {
    func currentToken(onToken: @escaping (String?) -> Void) {
        Messaging.messaging().token { token, _ in onToken(token) }
    }
}

final class SwiftCrashReporterBridge: CrashReporterBridge {
    func log(message: String) {
        Crashlytics.crashlytics().log(message)
    }

    func recordError(message: String) {
        Crashlytics.crashlytics().record(error: NSError(domain: "WABCustomer", code: 0, userInfo: [NSLocalizedDescriptionKey: message]))
    }

    func setUserId(userId: String?) {
        Crashlytics.crashlytics().setUserID(userId ?? "")
    }
}

final class SwiftAnalyticsBridge: AnalyticsBridge {
    func logEvent(name: String, params: [String: Any]) {
        Analytics.logEvent(name, parameters: params)
    }

    func setUserId(userId: String?) {
        Analytics.setUserID(userId)
    }

    func setUserProperty(key: String, value: String?) {
        Analytics.setUserProperty(value, forName: key)
    }

    func appInstanceId() -> String? {
        Analytics.appInstanceID()
    }
}
