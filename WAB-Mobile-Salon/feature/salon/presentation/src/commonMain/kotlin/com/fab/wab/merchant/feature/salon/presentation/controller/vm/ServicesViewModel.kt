package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.salon.domain.ServicesRepository
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServicesContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServicesContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServicesContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/** PRD M16 list: search, active toggle (deactivation confirmed), open / add. */
class ServicesViewModel(
    private val repository: ServicesRepository,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        repository.changes.onEach { saved ->
            updateState { copy(services = if (services.any { it.id == saved.id }) services.map { if (it.id == saved.id) saved else it } else services + saved) }
        }.launchIn(scope)
        load(refresh = false)
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnQuery -> updateState { copy(query = event.value) }
            is UiAction.OnToggle -> if (event.active) toggle(event.id, active = true) else updateState { copy(confirmDeactivate = event.id) }
            UiAction.OnConfirmDeactivate -> uiState.value.confirmDeactivate?.let { id ->
                updateState { copy(confirmDeactivate = null) }
                toggle(id, active = false)
            }
            UiAction.OnDismiss -> updateState { copy(confirmDeactivate = null) }
            is UiAction.OnServiceClick -> emitSideEffect(SideEffect.OpenService(event.id))
            UiAction.OnAdd -> emitSideEffect(SideEffect.OpenCatalog)
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load(refresh = false)
        }
    }

    private fun load(refresh: Boolean) {
        scope.launch {
            updateState { if (refresh) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = repository.services()) {
                is AppResult.Success -> updateState { copy(loading = false, refreshing = false, services = result.data, error = null) }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val keep = uiState.value.services.isNotEmpty()
                    updateState { copy(loading = false, refreshing = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun toggle(id: String, active: Boolean) {
        if (id in uiState.value.toggling) return
        scope.launch {
            updateState { copy(toggling = toggling + id) }
            val result = repository.setActive(id, active)
            updateState { copy(toggling = toggling - id) }
            when (result) {
                is AppResult.Success -> {
                    analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_SERVICE_TOGGLE, analyticsParams { text(SalonAnalytics.PARAM_STATE, active.toString()) }))
                    emitSideEffect(SideEffect.Toggled(active))
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}
