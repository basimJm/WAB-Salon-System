package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.feature.salon.domain.Closure
import com.fab.wab.merchant.feature.salon.domain.DaySchedule
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

/** Add / edit closure sheet ([id] null = new). */
data class ClosureForm(val id: String? = null, val from: LocalDate? = null, val to: LocalDate? = null, val reason: String = "")

/** What waits for the affected bookings to be handled. */
sealed interface PendingChange {
    data class Week(val days: List<DaySchedule>) : PendingChange
    data class SaveClosure(val form: ClosureForm) : PendingChange
}

/** 409 SCHEDULE_CONFLICT: [bookingIds] would break; the user cancels them or goes back. */
data class ScheduleConflict(val bookingIds: List<String>, val change: PendingChange)

enum class HoursMessage { WEEK_SAVED, CLOSURE_ADDED, CLOSURE_UPDATED, CLOSURE_DELETED }

sealed interface HoursContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val week: List<DaySchedule> = emptyList(),
        val savedWeek: List<DaySchedule> = emptyList(),
        val closures: List<Closure> = emptyList(),
        val today: LocalDate,
        val saving: Boolean = false,
        val closureSheet: ClosureForm? = null,
        val conflict: ScheduleConflict? = null,
        val deleteClosureId: String? = null,
        val branchScope: BranchScope = BranchScope(),
    ) {
        val invalidDays: Set<DayOfWeek> get() = week.filterNot { it.isValid }.map { it.day }.toSet()
        val canSaveWeek: Boolean get() = week != savedWeek && invalidDays.isEmpty() && !saving
        val upcoming: List<Closure> get() = closures.filter { it.to >= today }
        val past: List<Closure> get() = closures.filter { it.to < today }
    }

    sealed interface UiAction {
        data class OnToggleDay(val day: DayOfWeek, val working: Boolean) : UiAction
        data class OnOpenTime(val day: DayOfWeek, val minute: Int) : UiAction
        data class OnCloseTime(val day: DayOfWeek, val minute: Int) : UiAction
        data class OnCopyToAll(val day: DayOfWeek) : UiAction
        data object OnSaveWeek : UiAction
        data object OnAddClosure : UiAction
        data class OnEditClosure(val id: String) : UiAction
        data class OnClosureFrom(val date: LocalDate) : UiAction
        data class OnClosureTo(val date: LocalDate) : UiAction
        data class OnClosureReason(val value: String) : UiAction
        data object OnClosureSave : UiAction
        data object OnClosureDismiss : UiAction
        data class OnDeleteClosure(val id: String) : UiAction
        data object OnDeleteConfirm : UiAction
        data object OnConflictCancelBookings : UiAction
        data object OnDialogDismiss : UiAction
        data object OnRetry : UiAction
        data class OnBranchSelect(val branchId: String?) : UiAction
    }

    sealed interface SideEffect {
        data class Done(val message: HoursMessage, val cancelledBookings: Int = 0) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
