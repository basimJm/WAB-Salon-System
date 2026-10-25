package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.ui.alert.RequestAlert
import com.fab.wab.merchant.core.ui.alert.RequestAlertSound
import com.fab.wab.merchant.designsystem.components.booking.HandledBy
import com.fab.wab.merchant.designsystem.components.booking.RequestSheetDefaults
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.ActionMessage
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingRequestsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class RecordingAlert : RequestAlert {
    var plays = 0
    var stops = 0
    override fun play(sound: RequestAlertSound, vibrate: Boolean) {
        plays += 1
    }
    override fun stop() {
        stops += 1
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class BookingRequestsViewModelTest {

    private val repository = FakeBookingsRepository().also { fake ->
        fake.detailsById["r1"] = details("r1")
        fake.detailsById["r2"] = details("r2")
    }
    private val requests = MutableSharedFlow<String>(extraBufferCapacity = BUFFER)
    private val updates = MutableSharedFlow<String>(extraBufferCapacity = BUFFER)
    private val alert = RecordingAlert()

    private fun TestScope.viewModel() = BookingRequestsViewModel(
        BookingRequestsDependencies(
            repository = repository,
            requests = requests,
            updates = updates,
            clock = emptyFlow(),
            alert = alert,
            analytics = NoOpAnalyticsTracker,
            anotherMember = { "another member" },
            errorText = { "failed" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(viewModel: BookingRequestsViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    @Test
    fun requestsAreDeduplicatedQueuedAndAlertOnce() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        requests.emit("r1")
        requests.emit("r1")
        requests.emit("r2")
        val state = viewModel.state.first()
        assertEquals(listOf("r1", "r2"), state.queue.map { it.summary.id })
        assertEquals(1, alert.plays)
        repository.detailsById["r3"] = details("r3", status = BookingStatus.APPROVED)
        requests.emit("r3")
        assertEquals(2, viewModel.state.first().queue.size)
    }

    @Test
    fun unansweredPendingBookingsQueueOnStart() = runTest(UnconfinedTestDispatcher()) {
        repository.pages[1] = listOf(summary("r1"))
        val viewModel = viewModel()
        assertEquals("r1", viewModel.state.first().current?.summary?.id)
    }

    @Test
    fun acceptShowsTheConfirmationThenNext() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        requests.emit("r1")
        requests.emit("r2")
        viewModel.onEvent(UiAction.OnAccept)
        assertEquals(listOf("approve:r1"), repository.actions)
        val accepted = viewModel.state.first()
        assertEquals("WAB-r1", accepted.acceptedReference)
        assertEquals("r2", accepted.current?.summary?.id)
        viewModel.onEvent(UiAction.OnViewBooking)
        assertEquals(SideEffect.OpenDetails("r1"), effects.last())
        assertNull(viewModel.state.first().acceptedReference)
        assertTrue(alert.plays >= 2)
    }

    @Test
    fun alreadyHandledShowsHandledByThenDismisses() = runTest(UnconfinedTestDispatcher()) {
        repository.actionResult = AppResult.Error(AppError.ServerError(ErrorCode.ALREADY_HANDLED, HTTP_CONFLICT, "Handled by Lina"))
        val viewModel = viewModel()
        requests.emit("r1")
        viewModel.onEvent(UiAction.OnAccept)
        assertEquals(HandledBy("another member"), viewModel.state.first().handledBy)
        advanceTimeBy(RequestSheetDefaults.HANDLED_DISMISS_MS + 1)
        val closed = viewModel.state.first()
        assertNull(closed.handledBy)
        assertTrue(closed.queue.isEmpty())
    }

    @Test
    fun anUpdateFromAnotherMemberMarksTheShownRequestHandled() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        requests.emit("r1")
        requests.emit("r2")
        repository.detailsById["r2"] = details("r2", status = BookingStatus.REJECTED)
        updates.emit("r2")
        assertEquals(listOf("r1"), viewModel.state.first().queue.map { it.summary.id })
        repository.detailsById["r1"] = details("r1", status = BookingStatus.APPROVED)
        updates.emit("r1")
        assertEquals(HandledBy("another member", BookingStatus.APPROVED), viewModel.state.first().handledBy)
    }

    @Test
    fun rejectNeedsAReasonAndOtherErrorsKeepTheRequest() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        requests.emit("r1")
        viewModel.onEvent(UiAction.OnReject)
        viewModel.onEvent(UiAction.OnRejectConfirm)
        assertTrue(repository.actions.isEmpty())
        viewModel.onEvent(UiAction.OnReasonSelect(ResponseReason.FULLY_BOOKED))
        repository.actionResult = AppResult.Error(AppError.NetworkError("offline"))
        viewModel.onEvent(UiAction.OnRejectConfirm)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        assertEquals("r1", viewModel.state.first().current?.summary?.id)
        repository.actionResult = AppResult.Success(Unit)
        viewModel.onEvent(UiAction.OnReject)
        viewModel.onEvent(UiAction.OnReasonSelect(ResponseReason.FULLY_BOOKED))
        viewModel.onEvent(UiAction.OnRejectConfirm)
        assertEquals(SideEffect.ShowMessage(ActionMessage.REJECTED), effects.last())
        assertTrue(viewModel.state.first().queue.isEmpty())
        assertTrue(alert.stops > 0)
    }

    @Test
    fun viewDetailsAndDismissLeaveTheQueue() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        requests.emit("r1")
        requests.emit("r2")
        viewModel.onEvent(UiAction.OnViewDetails)
        assertEquals(SideEffect.OpenDetails("r1"), effects.last())
        viewModel.onEvent(UiAction.OnDismiss)
        assertTrue(viewModel.state.first().queue.isEmpty())
        requests.emit("r1")
        assertTrue(viewModel.state.first().queue.isEmpty())
    }

    private companion object {
        const val BUFFER = 8
        const val HTTP_CONFLICT = 409
    }
}
