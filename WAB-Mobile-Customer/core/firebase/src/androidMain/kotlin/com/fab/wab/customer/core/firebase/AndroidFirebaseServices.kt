package com.fab.wab.customer.core.firebase

import android.content.Context
import android.os.Bundle
import com.fab.wab.customer.core.analytics.AnalyticsBackend
import com.fab.wab.customer.core.analytics.AnalyticsEvent
import com.fab.wab.customer.core.analytics.AnalyticsValue
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.SharedFlow
import java.io.IOException

class AndroidPushTokenProvider(
    private val messaging: FirebaseMessaging = FirebaseMessaging.getInstance(),
) : PushTokenProvider {
    // A placeholder Firebase config (no valid API key yet) raises IllegalArgumentException: no token, no crash.
    override suspend fun currentToken(): String? = try {
        messaging.token.awaitResult()
    } catch (expected: IOException) {
        null
    } catch (expected: IllegalStateException) {
        null
    } catch (expected: IllegalArgumentException) {
        null
    }

    override val tokenUpdates: SharedFlow<String> get() = PushTokenRelay.tokenUpdates
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
