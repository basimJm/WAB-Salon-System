package com.fab.wab.merchant.feature.insights.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.NavigatorDelegation
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.ui.external.ExternalActions
import com.fab.wab.merchant.designsystem.components.external.rememberExternalHandoff
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.StatisticsContract
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.ReviewsViewModel
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.StatisticsViewModel
import com.fab.wab.merchant.feature.insights.presentation.resources.Res
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_report_message
import com.fab.wab.merchant.feature.insights.presentation.resources.reviews_report_subject
import com.fab.wab.merchant.feature.insights.presentation.screen.ReviewsScreen
import com.fab.wab.merchant.feature.insights.presentation.screen.StatisticsScreen
import org.jetbrains.compose.resources.getString
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/** M20 reviews (and M21 statistics), opened from the salon hub. */
class InsightsNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.Reviews> { ReviewsDestination() }
        navGraphBuilder.composable<Screen.Statistics> { StatisticsDestination() }
    }

    @Composable
    private fun ReviewsDestination() {
        val viewModel: ReviewsViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val handoff = rememberExternalHandoff(koinInject<ExternalActions>())
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is ReviewsContract.SideEffect.Dial -> handoff.call(effect.phone)
                is ReviewsContract.SideEffect.WhatsAppReport ->
                    handoff.whatsApp(effect.phone, getString(Res.string.reviews_report_message, effect.reviewId))
                is ReviewsContract.SideEffect.EmailReport -> handoff.emailMessage(
                    effect.address,
                    getString(Res.string.reviews_report_subject),
                    getString(Res.string.reviews_report_message, effect.reviewId),
                )
                is ReviewsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        ReviewsScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }

    @Composable
    private fun StatisticsDestination() {
        val viewModel: StatisticsViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is StatisticsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        StatisticsScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }
}
