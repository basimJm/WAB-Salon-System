package com.fab.wab.customer.app.analytics

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.navigation.NavController
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.compose.LocalAnalyticsTracker

/** Reports every destination change of the host to the tracker (PRD §14: every screen), once per app shell. */
@Composable
fun TrackNavigationScreens(
    navController: NavController,
    tracker: AnalyticsTracker = LocalAnalyticsTracker.current,
) {
    val currentTracker by rememberUpdatedState(tracker)
    DisposableEffect(navController) {
        val listener = NavController.OnDestinationChangedListener { _, destination, _ ->
            currentTracker.trackRoute(destination.route)
        }
        navController.addOnDestinationChangedListener(listener)
        onDispose { navController.removeOnDestinationChangedListener(listener) }
    }
}
