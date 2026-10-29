package com.fab.wab.merchant.feature.team.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.AffectedBookingsRepository
import com.fab.wab.merchant.core.domain.booking.AffectedReasons
import com.fab.wab.merchant.core.domain.booking.conflictBookingIds
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.team.domain.StaffDay
import com.fab.wab.merchant.feature.team.domain.StaffDraft
import com.fab.wab.merchant.feature.team.domain.StaffLimits
import com.fab.wab.merchant.feature.team.domain.StaffRepository
import com.fab.wab.merchant.feature.team.domain.TeamRepository
import com.fab.wab.merchant.feature.team.domain.toDraft
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.LeaveForm
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffChange
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffConflict
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffMessage
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.SideEffect
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

class StaffProfileDependencies(
    val staff: StaffRepository,
    val team: TeamRepository,
    val salon: SalonRepository,
    val affected: AffectedBookingsRepository,
    val analytics: AnalyticsTracker,
    val today: () -> LocalDate,
    val unavailableReason: suspend () -> String,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M17 staff profile (STAFF_MANAGE): skills, bride qualification, working days / custom hours, leaves, conflict flow. */
class StaffProfileViewModel(
    private val memberId: String,
    private val deps: StaffProfileDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(today = deps.today()), testScope) {

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleProfile(event) || handleSchedule(event) || handleLeaves(event) || handleDialogs(event)
    }

    private fun handleProfile(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnProvides -> edit { copy(providesServices = event.value) }
            is UiAction.OnBio -> edit { copy(bio = event.value.take(StaffLimits.BIO_MAX)) }
            is UiAction.OnYears -> edit { copy(years = event.value.filter(Char::isDigit)) }
            is UiAction.OnService -> edit {
                copy(serviceIds = if (event.id in serviceIds) serviceIds - event.id else serviceIds + event.id)
            }
            is UiAction.OnBride -> {
                if (uiState.value.brideAllowed) edit { copy(brideQualified = event.value) }
            }
            else -> return false
        }
        return true
    }

    private fun handleSchedule(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnDay -> edit {
                val days = if (event.working) {
                    (workingDays + StaffDay(event.day)).distinctBy { it.day }
                } else {
                    workingDays.filterNot { it.day == event.day }
                }
                copy(workingDays = days)
            }
            is UiAction.OnCustomHours -> {
                val open = uiState.value.salonDays[event.day]
                editDay(event.day) {
                    if (event.custom && open != null) copy(startMinute = open.openMinute, endMinute = open.closeMinute) else StaffDay(day)
                }
            }
            is UiAction.OnDayStart -> editDay(event.day) { copy(startMinute = event.minute) }
            is UiAction.OnDayEnd -> editDay(event.day) { copy(endMinute = event.minute) }
            UiAction.OnSave -> {
                val state = uiState.value
                if (!state.canSave) return true
                if (state.errors.isNotEmpty()) updateState { copy(showErrors = true) } else apply(StaffChange.Save(state.draft))
            }
            else -> return false
        }
        return true
    }

    private fun handleLeaves(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAddLeave -> updateState { copy(leaveSheet = LeaveForm(from = today, to = today)) }
            is UiAction.OnEditLeave -> uiState.value.leaves.firstOrNull { it.id == event.id && it.editable }?.let { leave ->
                updateState { copy(leaveSheet = LeaveForm(leave.id, leave.from, leave.to, leave.note.orEmpty())) }
            }
            is UiAction.OnLeaveFrom -> editLeave { copy(from = event.date, to = to?.takeIf { it >= event.date } ?: event.date) }
            is UiAction.OnLeaveTo -> editLeave { copy(to = event.date) }
            is UiAction.OnLeaveNote -> editLeave { copy(note = event.value.take(StaffLimits.NOTE_MAX)) }
            UiAction.OnLeaveSave -> uiState.value.leaveSheet?.let { form ->
                if (uiState.value.leaveValid) apply(StaffChange.SaveLeave(form))
            }
            UiAction.OnLeaveDismiss -> updateState { copy(leaveSheet = null) }
            else -> return false
        }
        return true
    }

    private fun handleDialogs(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnDeleteLeave -> updateState { copy(deleteLeaveId = event.id) }
            UiAction.OnDeleteConfirm -> deleteLeave()
            UiAction.OnConflictCancelBookings -> resolveConflict()
            UiAction.OnConflictReassign -> uiState.value.conflict?.let { conflict ->
                updateState { copy(conflict = null) }
                conflict.bookingIds.firstOrNull()?.let { emitSideEffect(SideEffect.OpenBooking(it)) }
            }
            UiAction.OnDismiss -> updateState { copy(conflict = null, deleteLeaveId = null) }
            UiAction.OnRetry -> load()
            else -> return false
        }
        return true
    }

    private fun edit(change: StaffDraft.() -> StaffDraft) = updateState { copy(draft = draft.change()) }

    private fun editDay(
        day: DayOfWeek,
        change: StaffDay.() -> StaffDay,
    ) = edit { copy(workingDays = workingDays.map { if (it.day == day) it.change() else it }) }

    private fun editLeave(change: LeaveForm.() -> LeaveForm) = updateState { copy(leaveSheet = leaveSheet?.change()) }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = deps.staff.profile(memberId)) {
                is AppResult.Success -> {
                    val draft = result.data.toDraft()
                    val salon = deps.salon.current.value ?: (deps.salon.refresh() as? AppResult.Success)?.data
                    val bride = salon?.kind?.brideAllowed == true
                    updateState {
                        copy(
                            loading = false,
                            profile = result.data,
                            original = draft,
                            draft = draft,
                            brideAllowed = bride,
                            memberName = deps.team.cached(memberId)?.fullName.orEmpty(),
                        )
                    }
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                    return@launch
                }
                AppResult.Loading -> return@launch
            }
            // The member's branch decides the services they can do and the days they can work (MER-065).
            val branchId = deps.team.cached(memberId)?.branchId
            (deps.staff.services(branchId) as? AppResult.Success)?.let { services -> updateState { copy(services = services.data) } }
            (deps.staff.salonDays(branchId) as? AppResult.Success)?.let { days -> updateState { copy(salonDays = days.data) } }
            (deps.staff.leaves(memberId) as? AppResult.Success)?.let { leaves -> updateState { copy(leaves = leaves.data) } }
        }
    }

    /** Sends [change]; 409 SCHEDULE_CONFLICT opens the affected-bookings sheet. */
    private fun apply(change: StaffChange) {
        scope.launch {
            updateState { copy(saving = true) }
            val error = when (change) {
                is StaffChange.Save -> saveProfile(change.draft)
                is StaffChange.SaveLeave -> saveLeave(change.form)
            }
            updateState { copy(saving = false) }
            if (error == null) return@launch
            val ids = error.conflictBookingIds()
            if (!ids.isNullOrEmpty()) updateState {
                copy(conflict = StaffConflict(ids, change))
            } else emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
        }
    }

    private suspend fun saveProfile(draft: StaffDraft): AppError? = when (val result = deps.staff.save(memberId, draft)) {
        is AppResult.Success -> {
            deps.analytics.trackAction(AnalyticsAction(TeamAnalytics.ACTION_STAFF_SAVE))
            val saved = result.data.toDraft()
            updateState { copy(profile = result.data, original = saved, draft = saved, showErrors = false) }
            emitSideEffect(SideEffect.Done(StaffMessage.PROFILE_SAVED))
            null
        }
        is AppResult.Error -> result.appError
        AppResult.Loading -> null
    }

    private suspend fun saveLeave(form: LeaveForm): AppError? {
        val from = form.from ?: return null
        val to = form.to ?: return null
        val id = form.id
        val result = if (id == null) deps.staff.addLeave(
            memberId,
            from,
            to,
            form.note,
        ) else deps.staff.updateLeave(memberId, id, from, to, form.note)
        return when (result) {
            is AppResult.Success -> {
                deps.analytics.trackAction(AnalyticsAction(TeamAnalytics.ACTION_LEAVE_SAVE))
                updateState {
                    copy(leaveSheet = null, leaves = (leaves.filterNot { it.id == result.data.id } + result.data).sortedBy { it.from })
                }
                emitSideEffect(SideEffect.Done(StaffMessage.LEAVE_SAVED))
                null
            }
            is AppResult.Error -> result.appError
            AppResult.Loading -> null
        }
    }

    private fun resolveConflict() {
        val conflict = uiState.value.conflict ?: return
        updateState { copy(conflict = null) }
        scope.launch {
            when (val result = deps.affected.cancel(conflict.bookingIds, AffectedReasons.STAFF_UNAVAILABLE, deps.unavailableReason())) {
                is AppResult.Success -> apply(conflict.change)
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }

    private fun deleteLeave() {
        val id = uiState.value.deleteLeaveId ?: return
        updateState { copy(deleteLeaveId = null) }
        scope.launch {
            when (val result = deps.staff.deleteLeave(memberId, id)) {
                is AppResult.Success -> {
                    updateState { copy(leaves = leaves.filterNot { it.id == id }) }
                    emitSideEffect(SideEffect.Done(StaffMessage.LEAVE_DELETED))
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}
