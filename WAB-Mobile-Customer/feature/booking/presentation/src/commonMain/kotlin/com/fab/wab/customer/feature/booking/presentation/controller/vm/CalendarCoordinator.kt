package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.booking.domain.model.BookingFlowDefaults
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.calendarDaysOf
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate

/** Step 2 (PRD S16, CUS-044): calendar of the next 90 days, availability slots for the picked day. */
internal class CalendarCoordinator(
    private val salonId: String,
    private val deps: BookingFlowDependencies,
    private val scope: () -> CoroutineScope,
    private val state: () -> UiState,
    private val update: (UiState.() -> UiState) -> Unit,
    private val updatePerson: (DraftPerson.() -> DraftPerson) -> Unit,
) {
    /** Today → +90 days, weekly days off and closures disabled; the picked day's slots are restored. */
    fun prepare() {
        val salon = state().salon ?: return
        val days = calendarDaysOf(deps.today(), BookingFlowDefaults.MAX_DAYS_AHEAD, salon.weeklySchedule, salon.upcomingClosures)
        val selected = state().person.date?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
        update { copy(calendar = days, visibleMonth = 0, selectedDate = selected) }
        if (selected != null && state().availability?.date != selected.toString()) loadSlots(selected)
    }

    fun changeMonth(delta: Int) {
        val months = state().calendar.map { it.date.year to it.date.monthNumber }.distinct()
        update { copy(visibleMonth = (visibleMonth + delta).coerceIn(0, (months.size - 1).coerceAtLeast(0))) }
    }

    fun selectDate(date: LocalDate) {
        if (state().calendar.none { it.date == date && it.enabled }) return
        update { copy(selectedDate = date, availability = null) }
        updatePerson { copy(date = date.toString(), start = null, staff = null) }
        loadSlots(date)
    }

    /** A "Full" slot cannot be picked; picking resets the staff choice (eligibility depends on the slot). */
    fun selectSlot(start: String) {
        val slot = state().availability?.slots?.firstOrNull { it.start == start && it.available } ?: return
        updatePerson { copy(start = slot.start, staff = null) }
    }

    private fun loadSlots(date: LocalDate) {
        scope().launch {
            update { copy(slotsLoading = true, slotsError = null) }
            val current = state()
            val others = current.persons.filterIndexed { index, _ -> index != current.currentPerson }
            when (val result = deps.loadAvailability(salonId, date.toString(), current.person, others)) {
                is AppResult.Success -> update { copy(slotsLoading = false, availability = result.data) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    update { copy(slotsLoading = false, slotsError = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }
}
