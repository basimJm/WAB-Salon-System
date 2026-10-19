package com.fab.wab.customer.app.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.placeholder_content_page
import com.fab.wab.customer.app.resources.placeholder_verify
import com.fab.wab.customer.app.resources.placeholder_faq
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** The FAQ page (CUS-055) reached from S21. */
fun NavGraphBuilder.registerPlaceholderProfileScreens() {
    composable<Screen.Faq> { PlaceholderRootScreen(Res.string.placeholder_faq) }
}

/** Legal / support pages still to come (CUS-05x); Login and Register link to them. */
fun NavGraphBuilder.registerPlaceholderAuthScreens() {
    composable<Screen.ContentPage> { entry ->
        PlaceholderRootScreen(Res.string.placeholder_content_page, detail = entry.toRoute<Screen.ContentPage>().slug)
    }
}

/** Destinations Home links to before their tasks land (S16 step 6 CUS-047). */
fun NavGraphBuilder.registerPlaceholderHomeScreens() {
    composable<Screen.BookingVerify> { entry ->
        PlaceholderRootScreen(Res.string.placeholder_verify, detail = entry.toRoute<Screen.BookingVerify>().draftId)
    }
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
