package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.permission.permissionSet
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.salon.domain.hubEntries
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/** PRD M12: permission-gated tiles with completeness warnings; pull-to-refresh reloads the salon. */
class SalonHubViewModel(
    private val salon: SalonRepository,
    private val session: Flow<SessionState>,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        combine(session, salon.current) { state, profile ->
            UiState(salon = profile, entries = hubEntries(state.permissionSet(), profile?.missing.orEmpty()))
        }.onEach { next -> updateState { copy(salon = next.salon, entries = next.entries) } }.launchIn(scope)
        refresh()
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnRefresh -> refresh()
            is UiAction.OnTileClick -> {
                analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_HUB_OPEN, analyticsParams { text(SalonAnalytics.PARAM_TILE, event.tile.name) }))
                emitSideEffect(SideEffect.Open(event.tile))
            }
        }
    }

    private fun refresh() {
        scope.launch {
            updateState { copy(refreshing = true) }
            val result = salon.refresh()
            updateState { copy(refreshing = false) }
            if (result is AppResult.Error) emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
        }
    }
}
