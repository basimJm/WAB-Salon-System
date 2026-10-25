package com.fab.wab.merchant.feature.home.presentation.controller.contract

import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.home.domain.Dashboard

sealed interface HomeContract {
    /**
     * [dashboard] = the last good answer (kept while refreshing or after a failed refresh); [nowMs] ticks the request
     * ages. The flags are the member's permissions (PRD §6, hidden-not-disabled).
     */
    data class UiState(
        val dashboard: Dashboard? = null,
        val memberName: String = "",
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val error: String? = null,
        val canRespond: Boolean = false,
        val canSeeStatistics: Boolean = false,
        val canSeeSubscription: Boolean = false,
        val ownBookingsOnly: Boolean = false,
        val nowMs: Long = 0L,
    ) {
        val showsPending: Boolean get() = canRespond && (dashboard?.pending?.count ?: 0) > 0
        val showsStatistics: Boolean get() = canSeeStatistics && dashboard?.quickStats != null
        val showsSubscriptionWarning: Boolean get() = canSeeSubscription && dashboard?.subscriptionWarning != null
        val incomplete: Boolean get() = dashboard?.salon?.state == SalonState.APPROVED_INCOMPLETE
        val hasNoBookingsToday: Boolean get() = dashboard?.today?.timeline.isNullOrEmpty()
    }

    sealed interface UiAction {
        data object OnRefresh : UiAction
        data object OnRetry : UiAction

        /** Back in the foreground: silent reload (the server caches the dashboard for 15 s). */
        data object OnResume : UiAction
        data object OnNotifications : UiAction
        data class OnBooking(val bookingId: String) : UiAction
        data object OnViewAllRequests : UiAction
        data object OnSubscription : UiAction
        data object OnSetup : UiAction
        data object OnCalendar : UiAction
    }

    sealed interface SideEffect {
        data object OpenNotifications : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
        data object OpenPendingRequests : SideEffect
        data object OpenSubscription : SideEffect
        data object OpenSetup : SideEffect
        data object OpenCalendar : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
