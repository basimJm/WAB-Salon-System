package com.fab.wab.customer.feature.salon.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.designsystem.components.media.MediaItemUi
import com.fab.wab.customer.designsystem.components.media.MediaKind
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsArgs
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract
import com.fab.wab.customer.feature.salon.presentation.controller.vm.ReviewsViewModel
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsViewModel
import com.fab.wab.customer.feature.salon.presentation.controller.vm.StaffSheetViewModel
import com.fab.wab.customer.feature.salon.presentation.resources.Res
import com.fab.wab.customer.feature.salon.presentation.resources.salon_not_available
import com.fab.wab.customer.feature.salon.presentation.screen.ReviewsScreen
import com.fab.wab.customer.feature.salon.presentation.screen.SalonDetailsScreen
import com.fab.wab.customer.feature.salon.presentation.screen.SalonMediaViewer
import com.fab.wab.customer.feature.salon.presentation.screen.ServiceSheet
import com.fab.wab.customer.feature.salon.presentation.screen.StaffSheet
import com.fab.wab.customer.feature.salon.presentation.screen.toUi
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S07 with the staff (S07a) / service (S07b) sheets, the media viewer (S10) and the review lists (S08/S09); booking: CUS-042. */
class SalonNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.SalonDetails> { entry ->
            val route = entry.toRoute<Screen.SalonDetails>()
            SalonDetailsDestination(SalonDetailsArgs(route.salonId, route.branchId))
        }
        navGraphBuilder.composable<Screen.SalonReviews> { entry ->
            val route = entry.toRoute<Screen.SalonReviews>()
            ReviewsDestination(ReviewTarget.Salon(route.salonId), route.addReview)
        }
        navGraphBuilder.composable<Screen.StaffReviews> { entry ->
            val route = entry.toRoute<Screen.StaffReviews>()
            ReviewsDestination(ReviewTarget.Staff(route.salonId, route.memberId), route.addReview)
        }
    }

    @Composable
    private fun ReviewsDestination(target: ReviewTarget, addReview: Boolean) {
        val viewModel: ReviewsViewModel = koinViewModel(key = target.toString()) { parametersOf(target, addReview) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                ReviewsContract.SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                ReviewsContract.SideEffect.Submitted -> Unit // the sheet shows the S09 success panel itself
                is ReviewsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        ReviewsScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }

    @Composable
    private fun SalonDetailsDestination(args: SalonDetailsArgs) {
        val viewModel: SalonDetailsViewModel = koinViewModel(key = args.salonId) { parametersOf(args) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        var staffSheet by remember { mutableStateOf<StaffRequest?>(null) }
        var serviceSheet by remember { mutableStateOf<SalonService?>(null) }
        var viewer by remember { mutableStateOf<MediaRequest?>(null) }
        val notAvailable = stringResource(Res.string.salon_not_available)
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                SideEffect.NotAvailable -> {
                    navigateBack()
                    notifications.show(notAvailable, style = NotificationStyle.Error)
                }
                is SideEffect.OpenReviews -> navigateTo(Screen.SalonReviews(effect.salonId))
                is SideEffect.OpenBooking -> navigateTo(Screen.BookingStart(effect.salonId, effect.branchId))
                SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
                is SideEffect.OpenStaff -> staffSheet = StaffRequest(effect.salonId, effect.memberId, (staffSheet?.key ?: 0) + 1)
                is SideEffect.OpenService -> serviceSheet = state.salon?.services?.firstOrNull { it.id == effect.serviceId }
                is SideEffect.OpenAddReview -> navigateTo(Screen.SalonReviews(effect.salonId, addReview = true))
                is SideEffect.OpenGallery -> viewer = MediaRequest(state.salon?.gallery.orEmpty().map { it.toUi() }, effect.index)
            }
        }
        SalonDetailsScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
        staffSheet?.let { request -> StaffSheetDestination(request, onDismiss = { staffSheet = null }) }
        viewer?.let { request -> SalonMediaViewer(items = request.items, startIndex = request.index, onClose = { viewer = null }) }
        serviceSheet?.let { service ->
            ServiceSheet(
                service = service,
                onMediaClick = { index -> viewer = MediaRequest(service.mediaUrls.map { MediaItemUi(it, it, MediaKind.Image) }, index) },
                onDismiss = { serviceSheet = null },
            )
        }
    }

    @Composable
    private fun StaffSheetDestination(request: StaffRequest, onDismiss: () -> Unit) {
        val viewModel: StaffSheetViewModel = koinViewModel(key = request.key.toString()) { parametersOf(request.salonId, request.memberId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is StaffSheetContract.SideEffect.OpenReviews -> {
                    onDismiss()
                    navigateTo(Screen.StaffReviews(effect.salonId, effect.memberId))
                }
                StaffSheetContract.SideEffect.OpenLogin -> {
                    onDismiss()
                    navigateTo(Graph.Auth)
                }
                is StaffSheetContract.SideEffect.OpenAddReview -> {
                    onDismiss()
                    navigateTo(Screen.StaffReviews(effect.salonId, effect.memberId, addReview = true))
                }
            }
        }
        StaffSheet(state = state, onAction = viewModel::onEvent, onDismiss = onDismiss)
    }
}

private data class StaffRequest(val salonId: String, val memberId: String, val key: Int)

/** S10 (CUS-039): the items of the tapped gallery / service media and the start index. */
private data class MediaRequest(val items: List<MediaItemUi>, val index: Int)
