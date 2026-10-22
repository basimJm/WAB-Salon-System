package com.fab.wab.customer.app.push

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import com.fab.wab.customer.app.deeplink.DeepLinkStore
import com.fab.wab.customer.app.navigation.RootTab
import com.fab.wab.customer.app.navigation.switchRootTab
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.core.notification.push.PushSignals

/**
 * PRD §10.2 inside the NavHost: foreground pushes become an in-app banner; a tapped system push routes once the
 * shell is on screen (after onboarding / S02). Also reports the app's foreground state to the platform services.
 */
@Composable
fun PushEffect(navController: NavHostController, deepLinks: DeepLinkStore, environment: AppEnvironment, isSignedIn: Boolean) {
    val notifications = rememberNotificationManager()
    LifecycleResumeEffect(Unit) {
        PushSignals.setAppForeground(true)
        onPauseOrDispose { PushSignals.setAppForeground(false) }
    }
    LaunchedEffect(Unit) {
        PushSignals.messages.collect { push -> notifications.show(push.message, style = NotificationStyle.Info, title = push.title) }
    }
    val tap by PushSignals.tap.collectAsStateWithLifecycle()
    LaunchedEffect(tap, isSignedIn) {
        val current = tap ?: return@LaunchedEffect
        PushSignals.consumeTap(current)
        when (val destination = pushTapDestinationOf(current, isSignedIn, environment.webBaseUrl)) {
            is PushTapDestination.Link -> deepLinks.publish(destination.url)
            PushTapDestination.Notifications -> {
                navController.switchRootTab(RootTab.Home)
                navController.navigate(Screen.Notifications)
            }
            PushTapDestination.Home -> navController.switchRootTab(RootTab.Home)
        }
    }
}
