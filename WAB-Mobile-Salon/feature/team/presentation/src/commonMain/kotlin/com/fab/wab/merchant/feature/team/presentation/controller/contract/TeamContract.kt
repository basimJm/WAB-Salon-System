package com.fab.wab.merchant.feature.team.presentation.controller.contract

import com.fab.wab.merchant.feature.team.domain.TeamAccess
import com.fab.wab.merchant.feature.team.domain.TeamMember

/** Deactivation refused with 409 SCHEDULE_CONFLICT: the member's upcoming [bookingIds]. */
data class MemberConflict(val memberId: String, val bookingIds: List<String>)

sealed interface TeamContract {
    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val error: String? = null,
        val members: List<TeamMember> = emptyList(),
        val access: TeamAccess = TeamAccess(manageTeam = false, manageStaff = false),
        val confirmDeactivate: String? = null,
        val conflict: MemberConflict? = null,
        val busy: Set<String> = emptySet(),
    )

    sealed interface UiAction {
        data class OnMemberClick(val id: String) : UiAction
        data object OnAdd : UiAction
        data class OnActiveChange(val id: String, val active: Boolean) : UiAction
        data object OnConfirmDeactivate : UiAction
        data object OnConflictCancelBookings : UiAction
        data object OnConflictReassign : UiAction
        data object OnDismiss : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data class OpenMember(val id: String) : SideEffect
        data class OpenStaff(val id: String) : SideEffect
        data object AddMember : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
        data class ActiveChanged(val active: Boolean) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
