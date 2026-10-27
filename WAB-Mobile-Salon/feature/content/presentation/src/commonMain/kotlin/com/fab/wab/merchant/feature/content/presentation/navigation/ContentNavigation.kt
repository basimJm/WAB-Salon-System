package com.fab.wab.merchant.feature.content.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.NavigatorDelegation
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContentPageContract
import com.fab.wab.merchant.feature.content.presentation.controller.vm.ContentPageViewModel
import com.fab.wab.merchant.feature.content.presentation.controller.vm.FaqViewModel
import com.fab.wab.merchant.feature.content.presentation.screen.ContentPageScreen
import com.fab.wab.merchant.feature.content.presentation.screen.FaqScreen
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S23: legal / about pages by slug, the contact page and the FAQ (reached from S11, S12 and S21). */
class ContentNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.ContentPage> { entry -> ContentPageDestination(entry.toRoute<Screen.ContentPage>().slug) }
        navGraphBuilder.composable<Screen.Faq> { FaqDestination() }
    }

    @Composable
    private fun ContentPageDestination(slug: String) {
        val viewModel: ContentPageViewModel = koinViewModel(key = slug) { parametersOf(slug) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is ContentPageContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
                is ContentPageContract.SideEffect.ShowInfo -> notifications.show(effect.message, style = NotificationStyle.Info)
            }
        }
        ContentPageScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }

    @Composable
    private fun FaqDestination() {
        val viewModel: FaqViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        FaqScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }
}
