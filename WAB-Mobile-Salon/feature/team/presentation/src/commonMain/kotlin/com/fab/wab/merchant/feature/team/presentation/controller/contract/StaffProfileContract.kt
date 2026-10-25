package com.fab.wab.merchant.feature.team.presentation.controller.contract

import com.fab.wab.merchant.feature.team.domain.Leave
import com.fab.wab.merchant.feature.team.domain.OpenHours
import com.fab.wab.merchant.feature.team.domain.ServiceOption
import com.fab.wab.merchant.feature.team.domain.StaffDraft
import com.fab.wab.merchant.feature.team.domain.StaffField
import com.fab.wab.merchant.feature.team.domain.StaffProfile
import com.fab.wab.merchant.feature.team.domain.leaveValid
import com.fab.wab.merchant.feature.team.domain.staffErrors
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

data class LeaveForm(val id: String? = null, val from: LocalDate? = null, val to: LocalDate? = null, val note: String = "")

/** What waits for the affected bookings (409 SCHEDULE_CONFLICT). */
sealed interface StaffChange {
    data class Save(val draft: StaffDraft) : StaffChange
    data class SaveLeave(val form: LeaveForm) : StaffChange
}

data class StaffConflict(val bookingIds: List<String>, val change: StaffChange)

enum class StaffMessage { PROFILE_SAVED, LEAVE_SAVED, LEAVE_DELETED }

sealed interface StaffProfileContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val memberName: String = "",
        val womenSalon: Boolean = false,
        val profile: StaffProfile? = null,
        val original: StaffDraft = StaffDraft(),
        val draft: StaffDraft = StaffDraft(),
        val services: List<ServiceOption> = emptyList(),
        val salonDays: Map<DayOfWeek, OpenHours?> = emptyMap(),
        val leaves: List<Leave> = emptyList(),
        val today: LocalDate,
        val showErrors: Boolean = false,
        val saving: Boolean = false,
        val leaveSheet: LeaveForm? = null,
        val conflict: StaffConflict? = null,
        val deleteLeaveId: String? = null,
    ) {
        val errors: Set<StaffField> get() = staffErrors(draft, salonDays)
        val visibleErrors: Set<StaffField> get() = if (showErrors) errors else emptySet()
        val canSave: Boolean get() = draft != original && !saving
        val leaveValid: Boolean get() = leaveSheet?.let { leaveValid(it.from, it.to, it.note, today) } == true
    }

    sealed interface UiAction {
        data class OnProvides(val value: Boolean) : UiAction
        data class OnBio(val value: String) : UiAction
        data class OnYears(val value: String) : UiAction
        data class OnService(val id: String) : UiAction
        data class OnBride(val value: Boolean) : UiAction
        data class OnDay(val day: DayOfWeek, val working: Boolean) : UiAction
        data class OnCustomHours(val day: DayOfWeek, val custom: Boolean) : UiAction
        data class OnDayStart(val day: DayOfWeek, val minute: Int) : UiAction
        data class OnDayEnd(val day: DayOfWeek, val minute: Int) : UiAction
        data object OnSave : UiAction
        data object OnAddLeave : UiAction
        data class OnEditLeave(val id: String) : UiAction
        data class OnLeaveFrom(val date: LocalDate) : UiAction
        data class OnLeaveTo(val date: LocalDate) : UiAction
        data class OnLeaveNote(val value: String) : UiAction
        data object OnLeaveSave : UiAction
        data object OnLeaveDismiss : UiAction
        data class OnDeleteLeave(val id: String) : UiAction
        data object OnDeleteConfirm : UiAction
        data object OnConflictCancelBookings : UiAction
        data object OnConflictReassign : UiAction
        data object OnDismiss : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data class Done(val message: StaffMessage) : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
