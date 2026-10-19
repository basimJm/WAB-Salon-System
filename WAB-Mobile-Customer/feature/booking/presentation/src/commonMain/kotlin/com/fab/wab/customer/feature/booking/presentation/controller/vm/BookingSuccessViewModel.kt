package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingSuccessAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.UiState
import kotlinx.coroutines.CoroutineScope

/** S17 (CUS-048): the route carries everything; the screen only routes the three intents. */
class BookingSuccessViewModel(
    bookingId: String,
    referenceNumber: String,
    private val analytics: AnalyticsTracker,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(UiState(bookingId, referenceNumber), testScope) {

    override fun handle(event: UiAction) {
        val state = uiState.value
        when (event) {
            UiAction.OnCopyReference -> {
                analytics.trackAction(AnalyticsAction(BookingSuccessAnalytics.ACTION_COPY_REFERENCE))
                emitSideEffect(SideEffect.CopyToClipboard(state.referenceNumber))
            }
            UiAction.OnViewBooking -> {
                analytics.trackAction(AnalyticsAction(BookingSuccessAnalytics.ACTION_VIEW_BOOKING))
                emitSideEffect(SideEffect.OpenBooking(state.bookingId))
            }
            UiAction.OnBackHome -> {
                analytics.trackAction(AnalyticsAction(BookingSuccessAnalytics.ACTION_BACK_HOME))
                emitSideEffect(SideEffect.GoHome)
            }
        }
    }
}
