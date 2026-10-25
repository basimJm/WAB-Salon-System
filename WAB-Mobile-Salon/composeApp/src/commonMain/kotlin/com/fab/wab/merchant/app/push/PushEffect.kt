package com.fab.wab.merchant.app.push

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.merchant.app.analytics.ShellAnalytics
import com.fab.wab.merchant.app.deeplink.DeepLinkStore
import com.fab.wab.merchant.core.analytics.compose.LocalAnalyticsTracker
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.core.realtime.RealtimeEvents

/**
 * Foreground pushes become an in-app banner; a tapped system push that carries a link the app handles is published to
 * the [DeepLinkStore] and tracked as `push_open` (PRD §14). Also reports the app's foreground state to the platform
 * push services.
 */
@Composable
fun PushEffect(deepLinks: DeepLinkStore) {
    val notifications = rememberNotificationManager()
    LifecycleResumeEffect(Unit) {
        PushSignals.setAppForeground(true)
        onPauseOrDispose { PushSignals.setAppForeground(false) }
    }
    LaunchedEffect(Unit) {
        // Booking requests open the request sheet (PRD M10) instead of a banner.
        PushSignals.messages.collect { push ->
            if (push.data[PushKeys.EVENT] != RealtimeEvents.BOOKING_REQUESTED) {
                notifications.show(push.message, style = NotificationStyle.Info, title = push.title)
            }
        }
    }
    val tap by PushSignals.tap.collectAsStateWithLifecycle()
    val tracker = LocalAnalyticsTracker.current
    LaunchedEffect(tap) {
        val current = tap ?: return@LaunchedEffect
        PushSignals.consumeTap(current)
        tracker.trackAction(ShellAnalytics.pushOpen(current))
        current.deepLink?.let(deepLinks::publish)
    }
}
