package com.fab.wab.merchant.feature.application.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.application.domain.model.setupChecklistOf
import com.fab.wab.merchant.feature.application.presentation.analytics.ApplicationAnalytics
import com.fab.wab.merchant.feature.application.presentation.controller.contract.SetupChecklistContract.SideEffect
import com.fab.wab.merchant.feature.application.presentation.controller.contract.SetupChecklistContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.SetupChecklistContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** PRD M06: the checklist reloads on start, pull-to-refresh and when coming back from a step screen. */
class SetupChecklistViewModel(
    private val salon: SalonRepository,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() = load(refresh = false)

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load(refresh = false)
            is UiAction.OnStepClick -> {
                analytics.trackAction(
                    AnalyticsAction(ApplicationAnalytics.ACTION_SETUP_ITEM, analyticsParams { text(ApplicationAnalytics.PARAM_STEP, event.step.name) }),
                )
                emitSideEffect(SideEffect.OpenStep(event.step))
            }
            UiAction.OnGoHome -> emitSideEffect(SideEffect.NavigateHome)
        }
    }

    private fun load(refresh: Boolean) {
        scope.launch {
            updateState { if (refresh) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = salon.refresh()) {
                is AppResult.Success -> updateState {
                    copy(loading = false, refreshing = false, steps = setupChecklistOf(result.data.missing), salonState = result.data.state)
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val hasContent = uiState.value.steps.isNotEmpty()
                    updateState { copy(loading = false, refreshing = false, error = if (hasContent) error else message) }
                    if (hasContent) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}
