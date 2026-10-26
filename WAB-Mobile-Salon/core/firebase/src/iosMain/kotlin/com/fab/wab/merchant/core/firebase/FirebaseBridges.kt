package com.fab.wab.merchant.core.firebase

/**
 * What Swift implements on the Firebase iOS SDK (see `iosApp/iosApp/FirebaseBridges.swift`) and registers once
 * after `FirebaseApp.configure()`. Callback style keeps the bridge free of Kotlin coroutine types.
 */
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

/** Registration point for Swift: `FirebaseBridges.shared.register(...)`. Unset bridges are no-ops. */
object FirebaseBridges {
    var pushToken: PushTokenBridge? = null
        private set
    var crashReporter: CrashReporterBridge? = null
        private set
    var analytics: AnalyticsBridge? = null
        private set

    fun register(
        pushToken: PushTokenBridge,
        crashReporter: CrashReporterBridge,
        analytics: AnalyticsBridge,
    ) {
        this.pushToken = pushToken
        this.crashReporter = crashReporter
        this.analytics = analytics
    }
}
