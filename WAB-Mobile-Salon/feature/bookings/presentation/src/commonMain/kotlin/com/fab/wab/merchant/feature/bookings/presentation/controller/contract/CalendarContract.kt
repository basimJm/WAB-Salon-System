package com.fab.wab.merchant.feature.bookings.presentation.controller.contract

import com.fab.wab.merchant.designsystem.components.calendar.CalendarMode
import com.fab.wab.merchant.designsystem.components.calendar.weekOf
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarEntry
import com.fab.wab.merchant.feature.bookings.domain.model.SalonHours
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import kotlinx.datetime.LocalDate

sealed interface CalendarContract {
    /** PRD M11 read-only calendar; [own] is set for `BOOKINGS_VIEW_OWN` members (own column only, no staff filter). */
    data class UiState(
        val mode: CalendarMode = CalendarMode.DAY,
        val date: LocalDate,
        val today: LocalDate,
        val entries: List<CalendarEntry> = emptyList(),
        val staff: List<StaffRef> = emptyList(),
        val staffFilter: Set<String> = emptySet(),
        val own: StaffRef? = null,
        val hours: SalonHours? = null,
        val loading: Boolean = true,
        val error: String? = null,
        val filterOpen: Boolean = false,
        val nowMs: Long = 0L,
    ) {
        /** Days the current page shows (and loads). */
        val days: List<LocalDate> get() = if (mode == CalendarMode.DAY) listOf(date) else weekOf(date)
        val canFilter: Boolean get() = own == null
    }

    sealed interface UiAction {
        data class OnModeChange(val mode: CalendarMode) : UiAction
        data object OnToday : UiAction
        data class OnPage(val forward: Boolean) : UiAction
        data class OnDatePick(val date: LocalDate) : UiAction
        data object OnFilterClick : UiAction
        data object OnFilterDismiss : UiAction
        data class OnFilterApply(val staffIds: Set<String>) : UiAction
        data class OnBlockClick(val bookingId: String) : UiAction
        data class OnDayClick(val isoDate: String) : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data class OpenDetails(val bookingId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
