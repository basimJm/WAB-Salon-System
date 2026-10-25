package com.fab.wab.merchant.core.firebase

/**
 * What Swift implements on the Firebase iOS SDK (see `iosApp/iosApp/FirebaseBridges.swift`) and registers once
 * after `FirebaseApp.configure()`. Callback style keeps the bridge free of Kotlin coroutine types.
 * Errors arrive as the `NSError.code` of the Firebase SDK plus its message.
 */
interface PhoneAuthBridge {
    fun startVerification(phoneE164: String, onCodeSent: (String) -> Unit, onError: (Int, String?) -> Unit)
    fun confirm(verificationId: String, code: String, onIdToken: (String) -> Unit, onError: (Int, String?) -> Unit)
    fun signOut()
}

interface PushTokenBridge {
    fun currentToken(onToken: (String?) -> Unit)
}

interface CrashReporterBridge {
    fun log(message: String)
    fun recordError(message: String)
    fun setUserId(userId: String?)
}

interface AnalyticsBridge {
    fun logEvent(name: String, params: Map<String, Any>)
    fun setUserId(userId: String?)
    fun setUserProperty(key: String, value: String?)
    fun appInstanceId(): String?
}

/** Registration point for Swift: `FirebaseBridges.shared.register(...)`. Unset bridges answer `Unavailable`. */
object FirebaseBridges {
    var phoneAuth: PhoneAuthBridge? = null
        private set
    var pushToken: PushTokenBridge? = null
        private set
    var crashReporter: CrashReporterBridge? = null
        private set
    var analytics: AnalyticsBridge? = null
        private set

    fun register(
        phoneAuth: PhoneAuthBridge,
        pushToken: PushTokenBridge,
        crashReporter: CrashReporterBridge,
        analytics: AnalyticsBridge,
    ) {
        this.phoneAuth = phoneAuth
        this.pushToken = pushToken
        this.crashReporter = crashReporter
        this.analytics = analytics
    }
}
