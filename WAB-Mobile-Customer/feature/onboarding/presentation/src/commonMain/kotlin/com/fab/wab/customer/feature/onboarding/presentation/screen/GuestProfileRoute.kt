package com.fab.wab.customer.feature.onboarding.presentation.screen

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.GuestProfileContract.SideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.vm.GuestProfileViewModel
import org.koin.compose.viewmodel.koinViewModel

/** S02 entry used by the app shell; [onSave] fires once both values are stored. */
@Composable
fun GuestProfileRoute(onSave: () -> Unit) {
    val viewModel: GuestProfileViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val currentOnSave by rememberUpdatedState(onSave)
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            SideEffect.Saved -> currentOnSave()
        }
    }
    GuestProfileScreen(state = state, onAction = viewModel::onEvent)
}
