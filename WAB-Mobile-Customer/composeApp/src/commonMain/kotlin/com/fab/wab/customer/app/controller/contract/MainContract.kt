package com.fab.wab.customer.app.controller.contract

import com.fab.wab.customer.core.domain.config.LaunchGate
import com.fab.wab.customer.core.domain.session.LaunchDestination

sealed interface MainContract {
    /**
     * PRD §4.2 first step: the config call decides [gate] before anything else renders. [loading] keeps the splash;
     * [error] shows the splash error with retry; a dismissed optional update turns the gate into [LaunchGate.Ready].
     */
    data class UiState(
        val loading: Boolean = true,
        val gate: LaunchGate? = null,
        val error: String? = null,
        val appVersion: String? = null,
        /** PRD §4.2 router after the gate: onboarding → S02 → Home; null until the gate is known. */
        val launch: LaunchDestination? = null,
        /** CUS-100: the splash stays until the brand logo animation has played once, even when config is faster. */
        val logoShown: Boolean = false,
    ) {
        val showSplash: Boolean get() = gate == null || !logoShown
        val showOnboarding: Boolean get() = launch == LaunchDestination.Onboarding
        val showGuestProfile: Boolean get() = launch == LaunchDestination.GuestProfile
    }

    sealed interface UiAction {
        data object OnUpdateClicked : UiAction
        data object OnOptionalUpdateDismissed : UiAction
        data object OnRetryClicked : UiAction
        data object OnLogoAnimationFinished : UiAction
        data object OnOnboardingFinished : UiAction
        data object OnGuestProfileSaved : UiAction
        data object OnSessionTimeOut : UiAction
    }

    sealed interface SideEffect {
        data class OpenStore(val url: String?) : SideEffect
    }
}
