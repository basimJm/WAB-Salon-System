package com.fab.wab.merchant.feature.application.presentation.controller.vm

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.application.domain.usecase.GetApplicationUseCase
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract.SideEffect
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** PRD M05: pending (prepare the profile meanwhile), rejected (reason + edit & resubmit), approved (continue). */
class ApplicationStatusViewModel(
    private val getApplication: GetApplicationUseCase,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() = load(refresh = false)

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load(refresh = false)
            UiAction.OnPrepareProfile -> emitSideEffect(SideEffect.NavigateToChecklist)
            UiAction.OnResubmit -> emitSideEffect(SideEffect.NavigateToResubmit)
            UiAction.OnContinue -> {
                val live = uiState.value.application?.state.let { it == SalonState.LIVE || it == SalonState.OFFLINE }
                emitSideEffect(if (live) SideEffect.NavigateHome else SideEffect.NavigateToChecklist)
            }
        }
    }

    private fun load(refresh: Boolean) {
        scope.launch {
            updateState { if (refresh) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = getApplication()) {
                is AppResult.Success -> {
                    updateState { copy(loading = false, refreshing = false, application = result.data, error = null) }
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(loading = false, refreshing = false) }
                    if (uiState.value.application == null) updateState {
                        copy(error = message)
                    } else emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}
