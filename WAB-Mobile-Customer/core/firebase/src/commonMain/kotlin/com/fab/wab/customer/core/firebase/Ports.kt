package com.fab.wab.customer.core.firebase

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** A verification Firebase started by SMS. [autoVerifiedIdToken] is set when Android verified the number silently. */
data class PhoneVerification(
    val id: String,
    val autoVerifiedIdToken: String? = null,
)

/**
 * Firebase Phone Auth as the app uses it (PRD S13): the backend pre-checks limits, Firebase sends the SMS,
 * the app confirms the code and hands the Firebase ID token to the backend. Nothing else of Firebase Auth leaks out.
 */
interface PhoneAuthGateway {
    suspend fun startVerification(phoneE164: String): FirebaseResult<PhoneVerification>
    suspend fun confirm(verification: PhoneVerification, code: String): FirebaseResult<String>
    suspend fun signOut()
}

/** The FCM registration token (PRD §10.2): current value on demand plus every refresh the platform reports. */
interface PushTokenProvider {
    suspend fun currentToken(): String?
    val tokenUpdates: SharedFlow<String>
}

/** Platform services (the Android messaging service, the iOS messaging delegate) publish refreshed tokens here. */
object PushTokenRelay {
    private val updates = MutableSharedFlow<String>(replay = 1, extraBufferCapacity = 1)
    val tokenUpdates: SharedFlow<String> = updates.asSharedFlow()

    fun publish(token: String) {
        updates.tryEmit(token)
    }
}

/** Crashlytics as the app uses it: breadcrumbs, non-fatal errors and the user id (PRD §14). */
interface CrashReporter {
    fun log(message: String)
    fun recordNonFatal(throwable: Throwable)
    fun setUserId(userId: String?)
}

/**
 * The Firebase Analytics app-instance id (PRD §14): sent to the backend on login so guest history is linked to the
 * account; null when Analytics is unavailable (no Firebase config, collection disabled).
 */
interface AppInstanceIdProvider {
    suspend fun appInstanceId(): String?
}
