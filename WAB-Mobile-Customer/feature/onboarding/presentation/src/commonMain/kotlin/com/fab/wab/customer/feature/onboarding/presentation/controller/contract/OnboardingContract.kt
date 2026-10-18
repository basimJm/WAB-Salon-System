package com.fab.wab.customer.feature.onboarding.presentation.controller.contract

import com.fab.wab.customer.feature.onboarding.domain.model.OnboardingPage

sealed interface OnboardingContract {
    data class UiState(
        val page: OnboardingPage = OnboardingPage.DISCOVER,
    ) {
        val pageIndex: Int get() = page.ordinal
        val isLastPage: Boolean get() = page.isLast
    }

    sealed interface UiAction {
        /** The pager settled on a page (swipe or programmatic). */
        data class OnPageShown(val index: Int) : UiAction
        data object OnNextClicked : UiAction
        data object OnSkipClicked : UiAction
    }

    sealed interface SideEffect {
        data class ScrollToPage(val index: Int) : SideEffect

        /** Skip or Get started: the shell continues the launch flow (S02 / Home). */
        data object Finished : SideEffect
    }
}
