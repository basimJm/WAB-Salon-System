package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.SideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.vm.OnboardingViewModel
import org.koin.compose.viewmodel.koinViewModel

/** Entry used by the app shell: owns the ViewModel, reports Skip / Get started through [onFinish]. */
@Composable
fun OnboardingRoute(onFinish: () -> Unit) {
    val viewModel: OnboardingViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val currentOnFinish by rememberUpdatedState(onFinish)
    val pagerController = rememberOnboardingPagerController()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is SideEffect.ScrollToPage -> pagerController.scrollTo(effect.index)
            SideEffect.Finished -> currentOnFinish()
        }
    }
    OnboardingScreen(state = state, onAction = viewModel::onEvent, pagerController = pagerController)
}
