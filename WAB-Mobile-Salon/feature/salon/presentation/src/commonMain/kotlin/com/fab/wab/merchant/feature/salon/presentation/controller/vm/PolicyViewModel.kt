package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.salon.domain.PolicyDraft
import com.fab.wab.merchant.feature.salon.domain.PolicyLimits
import com.fab.wab.merchant.feature.salon.domain.PolicyRepository
import com.fab.wab.merchant.feature.salon.domain.toDraft
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private const val WINDOW_DIGITS = 3
private const val PERCENT_DIGITS = 3

/** PRD M19: cancellation window, payment options, deposit with live example, refund / no-show outcomes, notes, preview. */
class PolicyViewModel(
    private val repository: PolicyRepository,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnWindowPreset -> {
                updateState { copy(customWindow = false) }
                edit { copy(windowHours = event.hours.toString()) }
            }
            UiAction.OnWindowCustom -> updateState { copy(customWindow = true) }
            is UiAction.OnWindowText -> edit { copy(windowHours = event.value.filter(Char::isDigit).take(WINDOW_DIGITS)) }
            is UiAction.OnOption -> edit { copy(options = if (event.option in options) options - event.option else options + event.option) }
            is UiAction.OnDeposit -> edit { copy(depositPercentage = event.value.filter(Char::isDigit).take(PERCENT_DIGITS)) }
            is UiAction.OnDepositRefundable -> edit { copy(depositRefundable = event.value) }
            is UiAction.OnFullRefund -> edit { copy(fullRefund = event.value) }
            is UiAction.OnNoShowDeposit -> edit { copy(noShowDeposit = event.value) }
            is UiAction.OnNoShowFull -> edit { copy(noShowFull = event.value) }
            is UiAction.OnNotes -> edit { copy(notes = event.value.take(PolicyLimits.NOTES_MAX)) }
            UiAction.OnPreview -> updateState { copy(previewOpen = true) }
            UiAction.OnClosePreview -> updateState { copy(previewOpen = false) }
            UiAction.OnSave -> save()
            UiAction.OnRetry -> load()
        }
    }

    private fun edit(change: PolicyDraft.() -> PolicyDraft) = updateState { copy(draft = draft.change()) }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = repository.policy()) {
                is AppResult.Success -> {
                    val draft = result.data?.toDraft() ?: PolicyDraft()
                    val custom = draft.windowHours.toIntOrNull() !in PolicyLimits.WINDOW_PRESETS
                    updateState { copy(loading = false, isNew = result.data == null, original = draft, draft = draft, customWindow = custom) }
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun save() {
        val state = uiState.value
        if (!state.canSave) return
        if (state.errors.isNotEmpty()) {
            updateState { copy(showErrors = true) }
            return
        }
        scope.launch {
            updateState { copy(saving = true) }
            val result = repository.save(state.draft)
            updateState { copy(saving = false) }
            when (result) {
                is AppResult.Success -> {
                    analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_POLICY_SAVE))
                    val saved = result.data.toDraft()
                    updateState { copy(isNew = false, original = saved, draft = saved, showErrors = false) }
                    emitSideEffect(SideEffect.Saved)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}
