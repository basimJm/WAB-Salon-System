package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.AffectedBookingsRepository
import com.fab.wab.merchant.core.domain.booking.AffectedReasons
import com.fab.wab.merchant.core.domain.booking.conflictBookingIds
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.salon.domain.DaySchedule
import com.fab.wab.merchant.feature.salon.domain.HoursLimits
import com.fab.wab.merchant.feature.salon.domain.HoursRepository
import com.fab.wab.merchant.feature.salon.domain.closureValid
import com.fab.wab.merchant.feature.salon.domain.copyHoursFrom
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ClosureForm
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursMessage
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PendingChange
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ScheduleConflict
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

class HoursDependencies(
    val repository: HoursRepository,
    val affected: AffectedBookingsRepository,
    val analytics: AnalyticsTracker,
    val today: () -> LocalDate,
    /** Text the customers see when a working-hours change cancels their booking. */
    val scheduleChangeReason: suspend () -> String,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M15: weekly schedule (15-min steps, close after open, copy to all), closures, affected-bookings conflict flow. */
class HoursViewModel(
    private val deps: HoursDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(today = deps.today()), testScope) {

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleWeek(event) || handleClosures(event) || handleDialogs(event)
    }

    private fun handleWeek(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnToggleDay -> editDay(event.day) { copy(isOff = !event.working) }
            is UiAction.OnOpenTime -> editDay(event.day) { copy(openMinute = event.minute) }
            is UiAction.OnCloseTime -> editDay(event.day) { copy(closeMinute = event.minute) }
            is UiAction.OnCopyToAll -> uiState.value.week.firstOrNull { it.day == event.day }?.let { source ->
                updateState { copy(week = week.copyHoursFrom(source)) }
            }
            UiAction.OnSaveWeek -> {
                if (uiState.value.canSaveWeek) apply(PendingChange.Week(uiState.value.week))
            }
            else -> return false
        }
        return true
    }

    private fun handleClosures(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAddClosure -> updateState { copy(closureSheet = ClosureForm(from = today, to = today)) }
            is UiAction.OnEditClosure -> uiState.value.closures.firstOrNull { it.id == event.id && it.editable }?.let { closure ->
                updateState { copy(closureSheet = ClosureForm(closure.id, closure.from, closure.to, closure.reason)) }
            }
            is UiAction.OnClosureFrom -> editClosure { copy(from = event.date, to = to?.takeIf { it >= event.date } ?: event.date) }
            is UiAction.OnClosureTo -> editClosure { copy(to = event.date) }
            is UiAction.OnClosureReason -> editClosure { copy(reason = event.value.take(HoursLimits.REASON_MAX)) }
            UiAction.OnClosureSave -> uiState.value.closureSheet?.let { form ->
                if (closureValid(form.from, form.to, form.reason, uiState.value.today)) apply(PendingChange.SaveClosure(form))
            }
            UiAction.OnClosureDismiss -> updateState { copy(closureSheet = null) }
            else -> return false
        }
        return true
    }

    private fun handleDialogs(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnDeleteClosure -> updateState { copy(deleteClosureId = event.id) }
            UiAction.OnDeleteConfirm -> deleteClosure()
            UiAction.OnConflictCancelBookings -> resolveConflict()
            UiAction.OnDialogDismiss -> updateState { copy(conflict = null, deleteClosureId = null) }
            UiAction.OnRetry -> load()
            else -> return false
        }
        return true
    }

    private fun editDay(day: DayOfWeek, change: DaySchedule.() -> DaySchedule) =
        updateState { copy(week = week.map { if (it.day == day) it.change() else it }) }

    private fun editClosure(change: ClosureForm.() -> ClosureForm) = updateState { copy(closureSheet = closureSheet?.change()) }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = deps.repository.load()) {
                is AppResult.Success -> updateState {
                    copy(loading = false, week = result.data.week, savedWeek = result.data.week, closures = result.data.closures)
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Sends [change]; a 409 SCHEDULE_CONFLICT opens the affected-bookings dialog instead of failing. */
    private fun apply(change: PendingChange, cancelled: Int = 0) {
        scope.launch {
            updateState { copy(saving = true) }
            val error = when (change) {
                is PendingChange.Week -> saveWeek(change.days, cancelled)
                is PendingChange.SaveClosure -> saveClosure(change.form, cancelled)
            }
            updateState { copy(saving = false) }
            if (error == null) return@launch
            val ids = error.conflictBookingIds()
            if (ids != null && ids.isNotEmpty()) {
                updateState { copy(conflict = ScheduleConflict(ids, change)) }
            } else {
                emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
            }
        }
    }

    private suspend fun saveWeek(days: List<DaySchedule>, cancelled: Int): AppError? =
        when (val result = deps.repository.saveWeek(days)) {
            is AppResult.Success -> {
                deps.analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_HOURS_SAVE))
                updateState { copy(week = result.data.week, savedWeek = result.data.week, closures = result.data.closures) }
                emitSideEffect(SideEffect.Done(HoursMessage.WEEK_SAVED, cancelled))
                null
            }
            is AppResult.Error -> result.appError
            AppResult.Loading -> null
        }

    private suspend fun saveClosure(form: ClosureForm, cancelled: Int): AppError? {
        val from = form.from ?: return null
        val to = form.to ?: return null
        val id = form.id
        val result = if (id == null) deps.repository.addClosure(
            from,
            to,
            form.reason,
        ) else deps.repository.updateClosure(id, from, to, form.reason)
        return when (result) {
            is AppResult.Success -> {
                deps.analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_CLOSURE_SAVE))
                updateState {
                    copy(
                        closureSheet = null,
                        closures = (closures.filterNot { it.id == result.data.id } + result.data).sortedBy { it.from },
                    )
                }
                emitSideEffect(SideEffect.Done(if (id == null) HoursMessage.CLOSURE_ADDED else HoursMessage.CLOSURE_UPDATED, cancelled))
                null
            }
            is AppResult.Error -> result.appError
            AppResult.Loading -> null
        }
    }

    /** "Cancel affected bookings": full refunds by the server, then the pending change is sent again. */
    private fun resolveConflict() {
        val conflict = uiState.value.conflict ?: return
        updateState { copy(conflict = null) }
        scope.launch {
            updateState { copy(saving = true) }
            val (code, text) = when (val change = conflict.change) {
                is PendingChange.SaveClosure -> AffectedReasons.CLOSURE to change.form.reason
                is PendingChange.Week -> AffectedReasons.OTHER to deps.scheduleChangeReason()
            }
            when (val result = deps.affected.cancel(conflict.bookingIds, code, text)) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(
                        AnalyticsAction(
                            SalonAnalytics.ACTION_CANCEL_AFFECTED,
                            analyticsParams { number(SalonAnalytics.PARAM_COUNT, conflict.bookingIds.size.toLong()) },
                        ),
                    )
                    updateState { copy(saving = false) }
                    apply(conflict.change, cancelled = conflict.bookingIds.size)
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(saving = false) }
                    emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun deleteClosure() {
        val id = uiState.value.deleteClosureId ?: return
        updateState { copy(deleteClosureId = null) }
        scope.launch {
            when (val result = deps.repository.deleteClosure(id)) {
                is AppResult.Success -> {
                    updateState { copy(closures = closures.filterNot { it.id == id }) }
                    emitSideEffect(SideEffect.Done(HoursMessage.CLOSURE_DELETED))
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }
}
