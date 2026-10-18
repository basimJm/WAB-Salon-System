package com.fab.wab.customer.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.compose.navigation
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.nav_bookings
import com.fab.wab.customer.app.resources.nav_favorites
import com.fab.wab.customer.app.resources.nav_profile
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/**
 * Root destinations whose feature has not landed yet (Favorites CUS-040, Bookings CUS-041, Profile CUS-053).
 * Each feature replaces its graph here with its own `Navigator.registerGraph`.
 */
fun NavGraphBuilder.registerPlaceholderRoots() {
    navigation<Graph.Favorites>(startDestination = Screen.Favorites) {
        composable<Screen.Favorites> { PlaceholderRootScreen(Res.string.nav_favorites) }
    }
    navigation<Graph.Bookings>(startDestination = Screen.Bookings) {
        composable<Screen.Bookings> { PlaceholderRootScreen(Res.string.nav_bookings) }
    }
    navigation<Graph.Profile>(startDestination = Screen.Profile) {
        composable<Screen.Profile> { PlaceholderRootScreen(Res.string.nav_profile) }
    }
}

@Composable
private fun PlaceholderRootScreen(title: StringResource) {
    AppScreen {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AppEmptyState(title = stringResource(title))
        }
    }
}
