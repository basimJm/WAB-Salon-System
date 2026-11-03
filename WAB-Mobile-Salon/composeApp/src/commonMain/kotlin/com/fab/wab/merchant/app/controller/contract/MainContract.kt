package com.fab.wab.merchant.app.controller.contract

import com.fab.wab.merchant.core.domain.config.LaunchGate

sealed interface MainContract {
    /**
     * PRD M01: the config call decides [gate] before anything else renders. [loading] keeps the splash; [error] shows
     * the splash error with retry; a dismissed optional update turns the gate into [LaunchGate.Ready].
     */
    data class UiState(
        val loading: Boolean = true,
        val gate: LaunchGate? = null,
        val error: String? = null,
        val appVersion: String? = null,
        /** MER-082: the splash stays until the brand logo animation has played once, even when config is faster. */
        val logoShown: Boolean = false,
    ) {
        val showSplash: Boolean get() = gate == null || !logoShown
    }

    sealed interface UiAction {
        data object OnUpdateClicked : UiAction
        data object OnOptionalUpdateDismissed : UiAction
        data object OnRetryClicked : UiAction
        data object OnLogoAnimationFinished : UiAction
        data object OnSessionTimeOut : UiAction
    }

    sealed interface SideEffect {
        /** The salon owner deactivated this member (socket `access.revoked`); already signed out. */
        data object AccessRevoked : SideEffect

        /** Force / optional update: open the store page the config call sent (platform default when null). */
        data class OpenStore(val url: String?) : SideEffect
    }
}
