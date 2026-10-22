package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsScreen
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingSuccessAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingSuccessViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

private class ActionsFake : AnalyticsTracker {
    val actions = mutableListOf<AnalyticsAction>()
    override fun trackScreen(screen: AnalyticsScreen) = Unit
    override fun trackAction(action: AnalyticsAction) { actions += action }
    override fun trackRoute(route: String?) = Unit
    override fun setUserId(userId: String?) = Unit
    override fun setUserProperty(key: String, value: String?) = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class BookingSuccessViewModelTest {

    private val effects = mutableListOf<SideEffect>()
    private val analytics = ActionsFake()

    private fun TestScope.viewModel(): BookingSuccessViewModel {
        val vm = BookingSuccessViewModel("b1", "WAB-1001", analytics, backgroundScope)
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun stateCarriesTheRouteArgumentsAndCopyEmitsTheReference() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        backgroundScope.launch { vm.state.collect {} }
        assertEquals("WAB-1001", vm.state.value.referenceNumber)
        vm.onEvent(UiAction.OnCopyReference)
        assertEquals<SideEffect>(SideEffect.CopyToClipboard("WAB-1001"), effects.single())
        assertEquals(true, vm.state.value.copied)
        assertEquals(BookingSuccessAnalytics.ACTION_COPY_REFERENCE, analytics.actions.single().name)
    }

    @Test
    fun viewBookingOpensS15AndBackHomeGoesHome() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnViewBooking)
        vm.onEvent(UiAction.OnBackHome)
        assertEquals(listOf(SideEffect.OpenBooking("b1"), SideEffect.GoHome), effects)
        assertEquals(
            listOf(BookingSuccessAnalytics.ACTION_VIEW_BOOKING, BookingSuccessAnalytics.ACTION_BACK_HOME),
            analytics.actions.map { it.name },
        )
    }
}
