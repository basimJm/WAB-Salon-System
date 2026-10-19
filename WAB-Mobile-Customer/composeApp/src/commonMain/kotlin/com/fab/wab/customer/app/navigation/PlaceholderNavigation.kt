package com.fab.wab.customer.app.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.compose.navigation
import androidx.navigation.toRoute
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.nav_profile
import com.fab.wab.customer.app.resources.placeholder_content_page
import com.fab.wab.customer.app.resources.placeholder_notifications
import com.fab.wab.customer.app.resources.placeholder_rating
import com.fab.wab.customer.app.resources.placeholder_verify
import com.fab.wab.customer.app.resources.profile_login_button
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/**
 * Root destinations whose feature has not landed yet (Profile CUS-053).
 * Each feature replaces its graph here with its own `Navigator.registerGraph`. The Profile placeholder carries the
 * "Log in" entry so the auth flow is reachable before the real profile screen exists.
 */
fun NavGraphBuilder.registerPlaceholderRoots(navController: NavHostController) {
    navigation<Graph.Profile>(startDestination = Screen.Profile) {
        composable<Screen.Profile> {
            PlaceholderRootScreen(Res.string.nav_profile) {
                AppPrimaryButton(
                    text = stringResource(Res.string.profile_login_button),
                    onClick = { navController.navigate(Graph.Auth) },
                )
            }
        }
    }
}

/** Legal / support pages still to come (CUS-05x); Login and Register link to them. */
fun NavGraphBuilder.registerPlaceholderAuthScreens() {
    composable<Screen.ContentPage> { entry ->
        PlaceholderRootScreen(Res.string.placeholder_content_page, detail = entry.toRoute<Screen.ContentPage>().slug)
    }
}

/** Destinations Home links to before their tasks land (S16 step 6 CUS-047, S18 CUS-049, S19 CUS-050). */
fun NavGraphBuilder.registerPlaceholderHomeScreens() {
    composable<Screen.BookingVerify> { entry ->
        PlaceholderRootScreen(Res.string.placeholder_verify, detail = entry.toRoute<Screen.BookingVerify>().draftId)
    }
    composable<Screen.RateBooking> { entry ->
        PlaceholderRootScreen(Res.string.placeholder_rating, detail = entry.toRoute<Screen.RateBooking>().bookingId)
    }
    composable<Screen.Notifications> { PlaceholderRootScreen(Res.string.placeholder_notifications) }
}

@Composable
private fun PlaceholderRootScreen(
    title: StringResource,
    detail: String? = null,
    action: (@Composable () -> Unit)? = null,
) {
    AppScreen {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space16),
            ) {
                AppEmptyState(title = stringResource(title), message = detail)
                action?.invoke()
            }
        }
    }
}
