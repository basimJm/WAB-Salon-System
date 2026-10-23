package com.fab.wab.merchant.feature.team.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.AffectedBookingsRepository
import com.fab.wab.merchant.core.domain.booking.AffectedReasons
import com.fab.wab.merchant.core.domain.booking.conflictBookingIds
import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.permissionSet
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.team.domain.TeamAccess
import com.fab.wab.merchant.feature.team.domain.TeamRepository
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberConflict
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract.SideEffect
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

class TeamDependencies(
    val team: TeamRepository,
    val affected: AffectedBookingsRepository,
    val session: Flow<SessionState>,
    val analytics: AnalyticsTracker,
    /** Reason the customers see when their booking is cancelled because the staff member left. */
    val unavailableReason: suspend () -> String,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M17 list: members, owner-only add / edit / (de)activate, staff profiles for STAFF_MANAGE, conflict flow. */
class TeamViewModel(
    private val deps: TeamDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        deps.session.onEach { session ->
            val permissions = session.permissionSet()
            updateState {
                copy(access = TeamAccess(permissions.can(OwnerCapability.TEAM_MANAGE), permissions.has(Permission.STAFF_MANAGE)))
            }
        }.launchIn(scope)
        load(refresh = false)
    }

    override fun handle(event: UiAction) {
        handleMembers(event) || handleDialogs(event)
    }

    private fun handleMembers(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnMemberClick -> open(event.id)
            UiAction.OnAdd -> if (uiState.value.access.canAdd) emitSideEffect(SideEffect.AddMember)
            is UiAction.OnActiveChange -> {
                val member = uiState.value.members.firstOrNull { it.id == event.id } ?: return true
                if (!uiState.value.access.canToggleActive(member)) return true
                if (event.active) setActive(event.id, active = true) else updateState { copy(confirmDeactivate = event.id) }
            }
            UiAction.OnConfirmDeactivate -> uiState.value.confirmDeactivate?.let { id ->
                updateState { copy(confirmDeactivate = null) }
                setActive(id, active = false)
            }
            else -> return false
        }
        return true
    }

    private fun handleDialogs(event: UiAction): Boolean {
        when (event) {
            UiAction.OnConflictCancelBookings -> cancelAffected()
            UiAction.OnConflictReassign -> uiState.value.conflict?.let { conflict ->
                updateState { copy(conflict = null) }
                conflict.bookingIds.firstOrNull()?.let { emitSideEffect(SideEffect.OpenBooking(it)) }
            }
            UiAction.OnDismiss -> updateState { copy(confirmDeactivate = null, conflict = null) }
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load(refresh = false)
            else -> return false
        }
        return true
    }

    private fun open(id: String) {
        val state = uiState.value
        val member = state.members.firstOrNull { it.id == id } ?: return
        when {
            state.access.canEdit(member) -> emitSideEffect(SideEffect.OpenMember(id))
            state.access.canEditStaff(member) -> emitSideEffect(SideEffect.OpenStaff(id))
        }
    }

    private fun load(refresh: Boolean) {
        scope.launch {
            updateState { if (refresh) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = deps.team.members()) {
                is AppResult.Success -> updateState { copy(loading = false, refreshing = false, error = null, members = result.data) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keep = uiState.value.members.isNotEmpty()
                    updateState { copy(loading = false, refreshing = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun setActive(id: String, active: Boolean) {
        if (id in uiState.value.busy) return
        scope.launch {
            updateState { copy(busy = busy + id) }
            val result = if (active) deps.team.reactivate(id) else deps.team.deactivate(id)
            updateState { copy(busy = busy - id) }
            when (result) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(
                        TeamAnalytics.ACTION_MEMBER_ACTIVE,
                        analyticsParams { text(TeamAnalytics.PARAM_STATE, active.toString()) },
                    ))
                    updateState { copy(members = members.map { if (it.id == id) result.data else it }) }
                    emitSideEffect(SideEffect.ActiveChanged(active))
                }
                is AppResult.Error -> {
                    val ids = result.appError.conflictBookingIds()
                    if (!active && !ids.isNullOrEmpty()) {
                        updateState { copy(conflict = MemberConflict(id, ids)) }
                    } else {
                        emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                    }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Full refunds by the server, then the deactivation is sent again. */
    private fun cancelAffected() {
        val conflict = uiState.value.conflict ?: return
        updateState { copy(conflict = null) }
        scope.launch {
            when (val result = deps.affected.cancel(conflict.bookingIds, AffectedReasons.STAFF_UNAVAILABLE, deps.unavailableReason())) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(
                        AnalyticsAction(
                            TeamAnalytics.ACTION_CANCEL_AFFECTED,
                            analyticsParams { number(TeamAnalytics.PARAM_COUNT, conflict.bookingIds.size.toLong()) },
                        ),
                    )
                    setActive(conflict.memberId, active = false)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}
