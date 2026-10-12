package com.fab.wab.customer.app.controller.contract

import com.fab.wab.customer.app.controller.state.SplashScreenState

sealed interface MainContract {
    data class UiState(
        val splashScreenState: SplashScreenState = SplashScreenState()
    )

    sealed interface UiAction {
        data object OnConfirmUpdateDialog : UiAction
        data object OnDismissUpdateDialog : UiAction
        data object OnConfirmMaintenanceDialog : UiAction
        data object OnRetryClicked : UiAction
        data object OnSessionTimeOut : UiAction
    }

    sealed interface SideEffect {
        data object NavigateToStore : SideEffect
        data object KillTheApp : SideEffect
    }
}
