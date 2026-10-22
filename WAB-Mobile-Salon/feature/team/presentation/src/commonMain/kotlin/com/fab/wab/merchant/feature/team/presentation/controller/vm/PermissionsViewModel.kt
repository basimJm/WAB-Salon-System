package com.fab.wab.merchant.feature.team.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.permission.PermissionTemplates
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.team.domain.TeamRepository
import com.fab.wab.merchant.feature.team.domain.toDraft
import com.fab.wab.merchant.feature.team.domain.toggled
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract.SideEffect
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** PRD M18 (owner only): grouped toggles, apply the role template, save through `PATCH /team/members/{id}`. */
class PermissionsViewModel(
    private val memberId: String,
    private val team: TeamRepository,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnToggle -> if (uiState.value.member?.isOwner == false) updateState { copy(selected = selected.toggled(event.permission)) }
            UiAction.OnApplyTemplate -> uiState.value.member?.takeIf { !it.isOwner }?.let { member ->
                updateState { copy(selected = PermissionTemplates.forRole(member.role)) }
            }
            UiAction.OnSave -> save()
            UiAction.OnRetry -> load()
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            val member = team.cached(memberId) ?: when (val result = team.member(memberId)) {
                is AppResult.Success -> result.data
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                    return@launch
                }
                AppResult.Loading -> return@launch
            }
            updateState { copy(loading = false, member = member, original = member.permissions, selected = member.permissions) }
        }
    }

    private fun save() {
        val state = uiState.value
        val member = state.member ?: return
        if (!state.canSave || member.isOwner) return
        scope.launch {
            updateState { copy(saving = true) }
            val result = team.update(memberId, member.toDraft(), state.selected)
            updateState { copy(saving = false) }
            when (result) {
                is AppResult.Success -> {
                    analytics.trackAction(AnalyticsAction(TeamAnalytics.ACTION_PERMISSIONS_SAVE, analyticsParams { number(TeamAnalytics.PARAM_COUNT, state.selected.size.toLong()) }))
                    updateState { copy(member = result.data, original = result.data.permissions, selected = result.data.permissions) }
                    emitSideEffect(SideEffect.Saved)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}
