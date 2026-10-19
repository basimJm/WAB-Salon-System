package com.fab.wab.customer.feature.onboarding.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.feature.onboarding.domain.model.OnboardingPage
import com.fab.wab.customer.feature.onboarding.domain.usecase.MarkOnboardingSeenUseCase
import com.fab.wab.customer.feature.onboarding.presentation.analytics.OnboardingAnalytics
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.SideEffect
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.UiAction
import com.fab.wab.customer.feature.onboarding.presentation.controller.contract.OnboardingContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class OnboardingViewModel(
    private val markOnboardingSeen: MarkOnboardingSeenUseCase,
    private val analytics: AnalyticsTracker,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    /** PRD S01: seen the moment it is displayed, even if the user quits mid-way. */
    override fun onStart() {
        scope.launch { markOnboardingSeen() }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnPageShown -> updateState { copy(page = OnboardingPage.at(event.index)) }
            UiAction.OnNextClicked -> next()
            UiAction.OnSkipClicked -> {
                analytics.trackAction(AnalyticsAction(OnboardingAnalytics.ACTION_SKIP, pageParams()))
                emitSideEffect(SideEffect.Finished)
            }
        }
    }

    private fun next() {
        val current = state.value.page
        if (current.isLast) {
            analytics.trackAction(AnalyticsAction(OnboardingAnalytics.ACTION_COMPLETE, pageParams()))
            emitSideEffect(SideEffect.Finished)
        } else {
            analytics.trackAction(AnalyticsAction(OnboardingAnalytics.ACTION_NEXT, pageParams()))
            emitSideEffect(SideEffect.ScrollToPage(current.ordinal + 1))
        }
    }

    private fun pageParams() = analyticsParams { number(OnboardingAnalytics.PARAM_PAGE, state.value.pageIndex.toLong() + 1) }
}
