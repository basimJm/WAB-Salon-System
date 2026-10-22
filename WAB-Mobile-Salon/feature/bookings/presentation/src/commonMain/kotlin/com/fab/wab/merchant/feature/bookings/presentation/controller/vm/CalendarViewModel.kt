package com.fab.wab.merchant.feature.bookings.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.permissionSet
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.calendar.CalendarMode
import com.fab.wab.merchant.designsystem.components.calendar.pageDate
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.domain.repository.CalendarRepository
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate

class CalendarDependencies(
    val calendar: CalendarRepository,
    val bookings: BookingsRepository,
    val session: Flow<SessionState>,
    /** Booking socket events: the shown page reloads. */
    val changes: Flow<Unit>,
    val clock: Flow<Long>,
    val today: () -> LocalDate,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M11: day / week pages, staff filter, own column for `BOOKINGS_VIEW_OWN`, tap → M09, live updates. */
class CalendarViewModel(
    private val deps: CalendarDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = deps.today().let { UiState(date = it, today = it) }, testScope) {

    private var loadJob: Job? = null

    override fun onStart() {
        deps.changes.onEach { load(silent = true) }.launchIn(scope)
        deps.clock.onEach { now -> updateState { copy(nowMs = now) } }.launchIn(scope)
        scope.launch {
            val own = ownColumn(deps.session.first())
            updateState { copy(own = own) }
            if (own == null) (deps.bookings.staff() as? AppResult.Success)?.let { staff -> updateState { copy(staff = staff.data) } }
            (deps.calendar.hours() as? AppResult.Success)?.let { hours -> updateState { copy(hours = hours.data) } }
            load()
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnModeChange -> if (event.mode != uiState.value.mode) {
                updateState { copy(mode = event.mode) }
                track(BookingsAnalytics.ACTION_CALENDAR_MODE)
                load()
            }
            UiAction.OnToday -> show(deps.today().also { today -> updateState { copy(today = today) } })
            is UiAction.OnPage -> show(pageDate(uiState.value.date, uiState.value.mode, event.forward))
            is UiAction.OnDatePick -> show(event.date)
            UiAction.OnFilterClick -> if (uiState.value.canFilter) updateState { copy(filterOpen = true) }
            UiAction.OnFilterDismiss -> updateState { copy(filterOpen = false) }
            is UiAction.OnFilterApply -> {
                updateState { copy(staffFilter = event.staffIds, filterOpen = false) }
                track(BookingsAnalytics.ACTION_CALENDAR_FILTER)
                load()
            }
            is UiAction.OnBlockClick -> emitSideEffect(SideEffect.OpenDetails(event.bookingId))
            is UiAction.OnDayClick -> runCatching { LocalDate.parse(event.isoDate) }.getOrNull()?.let { day ->
                updateState { copy(mode = CalendarMode.DAY) }
                show(day, force = true)
            }
            UiAction.OnRetry -> load()
        }
    }

    private fun show(date: LocalDate, force: Boolean = false) {
        val before = uiState.value
        updateState { copy(date = date) }
        if (force || before.days != uiState.value.days) load()
    }

    private fun load(silent: Boolean = false) {
        loadJob?.cancel()
        loadJob = scope.launch {
            val state = uiState.value
            if (!silent) updateState { copy(loading = true, error = null) }
            val days = state.days
            val filter = if (state.own == null) state.staffFilter else emptySet()
            when (val result = deps.calendar.entries(days.first(), days.last(), filter)) {
                is AppResult.Success -> updateState { copy(entries = result.data, loading = false, error = null) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keep = uiState.value.entries.isNotEmpty() && silent
                    updateState { copy(loading = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun track(name: String) {
        deps.analytics.trackAction(AnalyticsAction(name, analyticsParams { text(BookingsAnalytics.PARAM_MODE, uiState.value.mode.name) }))
    }

    private fun ownColumn(session: SessionState): StaffRef? {
        val signedIn = session as? SessionState.SignedIn ?: return null
        val permissions = session.permissionSet()
        return if (permissions.has(Permission.BOOKINGS_VIEW_ALL)) null else StaffRef(signedIn.member.id, signedIn.member.firstName)
    }
}
