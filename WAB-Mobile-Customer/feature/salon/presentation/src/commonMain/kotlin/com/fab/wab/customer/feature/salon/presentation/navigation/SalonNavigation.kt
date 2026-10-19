package com.fab.wab.customer.feature.salon.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsViewModel
import com.fab.wab.customer.feature.salon.presentation.screen.SalonDetailsScreen
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S07 (staff / service sheets: CUS-037, media viewer: CUS-039, reviews: CUS-038, booking: CUS-042). */
class SalonNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.SalonDetails> { entry -> SalonDetailsDestination(entry.toRoute<Screen.SalonDetails>().salonId) }
    }

    @Composable
    private fun SalonDetailsDestination(salonId: String) {
        val viewModel: SalonDetailsViewModel = koinViewModel(key = salonId) { parametersOf(salonId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is SideEffect.OpenReviews -> navigateTo(Screen.SalonReviews(effect.salonId))
                is SideEffect.OpenBooking -> navigateTo(Screen.BookingStart(effect.salonId))
                SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
                is SideEffect.OpenStaff, is SideEffect.OpenService, is SideEffect.OpenGallery, is SideEffect.OpenAddReview -> Unit
            }
        }
        SalonDetailsScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }
}
