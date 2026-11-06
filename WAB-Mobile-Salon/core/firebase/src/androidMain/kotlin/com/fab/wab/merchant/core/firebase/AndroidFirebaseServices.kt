package com.fab.wab.merchant.core.firebase

import android.content.Context
import android.os.Bundle
import android.util.Log
import com.fab.wab.merchant.core.analytics.AnalyticsBackend
import com.fab.wab.merchant.core.analytics.AnalyticsEvent
import com.fab.wab.merchant.core.analytics.AnalyticsValue
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import java.io.IOException
import kotlin.coroutines.cancellation.CancellationException

/** How long [AndroidPushTokenProvider.currentToken] waits for `onRegistered` after `register()`. */
private const val REGISTRATION_TIMEOUT_MS = 15_000L

private const val TAG = "FCM"

class AndroidPushTokenProvider(
    private val messaging: FirebaseMessaging = FirebaseMessaging.getInstance(),
) : PushTokenProvider {
    // FCM 26: `register()` replaces the deprecated `getToken()`; the token arrives in the messaging service's
    // `onRegistered`, which publishes it to [PushTokenRelay] (replay 1). A token the relay already holds is returned
    // without another `register()`: every call publishes again, and the installation sync reads this once per sync (MER-094).
    // A failure (no valid Firebase config, `API disabled` without the manifest flag, no network) is logged, never silent.
    override suspend fun currentToken(): String? {
        PushTokenRelay.latest?.let { return it }
        return try {
            messaging.register().awaitResult()
            withTimeoutOrNull(REGISTRATION_TIMEOUT_MS) { PushTokenRelay.tokenUpdates.first() } ?: existingToken()
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (failure: IOException) {
            logFailure(failure)
        } catch (failure: IllegalStateException) {
            logFailure(failure)
        } catch (failure: IllegalArgumentException) {
            logFailure(failure)
        }
    }

    /** Class and message only: the message of a Firebase failure explains what to fix, and it never holds a token. */
    private fun logFailure(failure: Exception): String? {
        Log.w(TAG, "Push token registration failed: ${failure.javaClass.name}: ${failure.message}")
        return null
    }

    override val tokenUpdates: SharedFlow<String> get() = PushTokenRelay.tokenUpdates

    // An already-registered install may not get `onRegistered` again; read the stored registration once and relay it.
    @Suppress("DEPRECATION") // FCM 26: getToken() is the only read of an existing registration; register() covers new ones
    private suspend fun existingToken(): String? = messaging.token.awaitResult()?.also { PushTokenRelay.publish(it) }
}

class AndroidCrashReporter(
    private val crashlytics: FirebaseCrashlytics = FirebaseCrashlytics.getInstance(),
) : CrashReporter {
    override fun log(message: String) = crashlytics.log(message)
    override fun recordNonFatal(throwable: Throwable) = crashlytics.recordException(throwable)
    override fun setUserId(userId: String?) = crashlytics.setUserId(userId.orEmpty())
}

/** Sends the already validated, context-enriched events of `core/analytics` to Firebase Analytics. */
class AndroidFirebaseAnalyticsBackend(context: Context) : AnalyticsBackend {
    private val analytics: FirebaseAnalytics = FirebaseAnalytics.getInstance(context)

    override suspend fun logEvent(event: AnalyticsEvent) = analytics.logEvent(event.name, event.params.toBundle())
    override suspend fun setUserId(userId: String?) = analytics.setUserId(userId)
    override suspend fun setUserProperty(key: String, value: String?) = analytics.setUserProperty(key, value)
}

class AndroidAppInstanceIdProvider(context: Context) : AppInstanceIdProvider {
    private val analytics: FirebaseAnalytics = FirebaseAnalytics.getInstance(context)

    override suspend fun appInstanceId(): String? = try {
        analytics.appInstanceId.awaitResult()
    } catch (expected: IOException) {
        null
    } catch (expected: IllegalStateException) {
        null
    } catch (expected: IllegalArgumentException) {
        null
    }
}

internal fun Map<String, AnalyticsValue>.toBundle(): Bundle = Bundle().also { bundle ->
    forEach { (key, value) ->
        when (value) {
            is AnalyticsValue.Text -> bundle.putString(key, value.value)
            is AnalyticsValue.Number -> bundle.putLong(key, value.value)
            is AnalyticsValue.Decimal -> bundle.putDouble(key, value.value)
            is AnalyticsValue.Flag -> bundle.putString(key, value.value.toString())
        }
    }
}
