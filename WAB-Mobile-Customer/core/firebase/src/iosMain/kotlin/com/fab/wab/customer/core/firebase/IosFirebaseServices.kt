package com.fab.wab.customer.core.firebase

import com.fab.wab.customer.core.analytics.AnalyticsBackend
import com.fab.wab.customer.core.analytics.AnalyticsEvent
import com.fab.wab.customer.core.analytics.AnalyticsValue
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Wraps the Swift phone-auth bridge into the suspending port; no bridge means Firebase is not wired yet. */
class IosPhoneAuthGateway : PhoneAuthGateway {
    override suspend fun startVerification(phoneE164: String): FirebaseResult<PhoneVerification> {
        val bridge = FirebaseBridges.phoneAuth ?: return FirebaseResult.Failure(FirebaseFailure.Unavailable)
        return suspendCancellableCoroutine { continuation ->
            bridge.startVerification(
                phoneE164,
                onCodeSent = { id -> if (continuation.isActive) continuation.resume(FirebaseResult.Success(PhoneVerification(id))) },
                onError = { code, message ->
                    if (continuation.isActive) {
                        continuation.resume(FirebaseResult.Failure(authFailureForCode(code, PhoneAuthStage.Start, message)))
                    }
                },
            )
        }
    }

    override suspend fun confirm(verification: PhoneVerification, code: String): FirebaseResult<String> {
        val bridge = FirebaseBridges.phoneAuth ?: return FirebaseResult.Failure(FirebaseFailure.Unavailable)
        return suspendCancellableCoroutine { continuation ->
            bridge.confirm(
                verification.id,
                code,
                onIdToken = { token -> if (continuation.isActive) continuation.resume(FirebaseResult.Success(token)) },
                onError = { errorCode, message ->
                    if (continuation.isActive) {
                        continuation.resume(FirebaseResult.Failure(authFailureForCode(errorCode, PhoneAuthStage.Confirm, message)))
                    }
                },
            )
        }
    }

    override suspend fun signOut() {
        FirebaseBridges.phoneAuth?.signOut()
    }
}

class IosPushTokenProvider : PushTokenProvider {
    override suspend fun currentToken(): String? {
        val bridge = FirebaseBridges.pushToken ?: return null
        return suspendCancellableCoroutine { continuation ->
            bridge.currentToken { token -> if (continuation.isActive) continuation.resume(token) }
        }
    }

    override val tokenUpdates: SharedFlow<String> get() = PushTokenRelay.tokenUpdates
}

class IosCrashReporter : CrashReporter {
    override fun log(message: String) {
        FirebaseBridges.crashReporter?.log(message)
    }

    override fun recordNonFatal(throwable: Throwable) {
        FirebaseBridges.crashReporter?.recordError(throwable.message ?: throwable::class.simpleName.orEmpty())
    }

    override fun setUserId(userId: String?) {
        FirebaseBridges.crashReporter?.setUserId(userId)
    }
}

class IosFirebaseAnalyticsBackend : AnalyticsBackend {
    override suspend fun logEvent(event: AnalyticsEvent) {
        FirebaseBridges.analytics?.logEvent(event.name, event.params.toBridgeParams())
    }

    override suspend fun setUserId(userId: String?) {
        FirebaseBridges.analytics?.setUserId(userId)
    }

    override suspend fun setUserProperty(key: String, value: String?) {
        FirebaseBridges.analytics?.setUserProperty(key, value)
    }
}

class IosAppInstanceIdProvider : AppInstanceIdProvider {
    override suspend fun appInstanceId(): String? = FirebaseBridges.analytics?.appInstanceId()
}

internal fun Map<String, AnalyticsValue>.toBridgeParams(): Map<String, Any> = mapValues { (_, value) ->
    when (value) {
        is AnalyticsValue.Text -> value.value
        is AnalyticsValue.Number -> value.value
        is AnalyticsValue.Decimal -> value.value
        is AnalyticsValue.Flag -> value.value.toString()
    }
}
