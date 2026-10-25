package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsScreen
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.AnalyticsValue
import com.fab.wab.merchant.core.ui.alert.SilentRequestAlert
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

internal class RecordingTracker : AnalyticsTracker {
    val actions = mutableListOf<AnalyticsAction>()
    override fun trackScreen(screen: AnalyticsScreen) = Unit
    override fun trackAction(action: AnalyticsAction) {
        actions += action
    }
    override fun trackRoute(route: String?) = Unit
    override fun setUserId(userId: String?) = Unit
    override fun setUserProperty(key: String, value: String?) = Unit
}

private const val SIGNAL_BUFFER = 8
private const val SHOWN_AT_MS = 1_000L
private const val ANSWERED_AT_MS = 6_000L
private const val RESPONSE_SECONDS = 5L

/** MER-051 (PRD §14): `request_shown` with its channel once per request, response time on the answer. */
@OptIn(ExperimentalCoroutinesApi::class)
class BookingRequestsAnalyticsTest {
    @Test
    fun shownOnceWithTheChannelAndTheAnswerCarriesTheResponseTime() = runTest(UnconfinedTestDispatcher()) {
        val repository = FakeBookingsRepository().also { it.detailsById["r1"] = details("r1") }
        val requests = MutableSharedFlow<String>(extraBufferCapacity = SIGNAL_BUFFER)
        val clock = MutableSharedFlow<Long>(extraBufferCapacity = SIGNAL_BUFFER)
        val tracker = RecordingTracker()
        val viewModel = BookingRequestsViewModel(
            BookingRequestsDependencies(repository, requests, MutableSharedFlow(), clock, SilentRequestAlert, tracker, { "x" }, { "e" }),
            testScope = backgroundScope,
        )
        backgroundScope.launch { viewModel.state.collect { } }

        clock.emit(SHOWN_AT_MS)
        requests.emit("r1")
        requests.emit("r1")
        val shown = tracker.actions.filter { it.name == BookingsAnalytics.ACTION_SHOWN }
        assertEquals(1, shown.size)
        assertEquals(AnalyticsValue.Text(BookingsAnalytics.CHANNEL_IN_APP), shown.single().params[BookingsAnalytics.PARAM_CHANNEL])

        clock.emit(ANSWERED_AT_MS)
        viewModel.onEvent(UiAction.OnAccept)
        val accept = tracker.actions.single { it.name == BookingsAnalytics.ACTION_ACCEPT }
        assertEquals(AnalyticsValue.Number(RESPONSE_SECONDS), accept.params[BookingsAnalytics.PARAM_RESPONSE_SECONDS])
    }
}
