package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsDefaults
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.ActionMessage
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.DetailsDialog
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class BookingDetailsViewModelTest {

    private val repository = FakeBookingsRepository()
    private val changes = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    private fun TestScope.viewModel() = BookingDetailsViewModel(
        bookingId = "b1",
        repository = repository,
        changes = changes,
        clock = emptyFlow(),
        analytics = NoOpAnalyticsTracker,
        errorText = { "failed" },
        testScope = backgroundScope,
    )

    private fun TestScope.effectsOf(viewModel: BookingDetailsViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    @Test
    fun loadsDetailsAndExposesTheServerActions() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val state = viewModel.state.first { !it.loading }
        assertEquals("WAB-b1", state.details?.summary?.reference)
        assertEquals(setOf(BookingAction.APPROVE, BookingAction.REJECT), state.actions)
        changes.emit(Unit)
        assertEquals(2, repository.detailsCalls)
    }

    @Test
    fun assignedStaffSeesAndRunsCompleteAndNoShowWhenTheServerSendsThem() = runTest(UnconfinedTestDispatcher()) {
        // MER-086 (§5.21): the booking's own staff (BOOKINGS_VIEW_OWN only) gets COMPLETE / NO_SHOW in `actions`.
        repository.detailsResult = AppResult.Success(
            details(actions = setOf(BookingAction.COMPLETE, BookingAction.NO_SHOW), status = BookingStatus.APPROVED),
        )
        val viewModel = viewModel()
        assertEquals(setOf(BookingAction.COMPLETE, BookingAction.NO_SHOW), viewModel.state.first { !it.loading }.actions)
        viewModel.onEvent(UiAction.OnActionClick(BookingAction.NO_SHOW))
        assertEquals(DetailsDialog.Confirm(BookingAction.NO_SHOW), viewModel.state.first().dialog)
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertEquals("noShow", repository.actions.last())
    }

    @Test
    fun acceptRunsAtOnceThenRefreshes() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnActionClick(BookingAction.APPROVE))
        assertEquals(listOf("approve:b1"), repository.actions)
        assertEquals(SideEffect.ShowMessage(ActionMessage.APPROVED), effects.single())
        assertEquals(2, repository.detailsCalls)
    }

    @Test
    fun rejectNeedsAReasonAndOtherNeedsItsText() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnActionClick(BookingAction.REJECT))
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertTrue(repository.actions.isEmpty())
        viewModel.onEvent(UiAction.OnReasonSelect(ResponseReason.OTHER))
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertTrue(repository.actions.isEmpty())
        viewModel.onEvent(UiAction.OnReasonText("x".repeat(BookingsDefaults.REASON_TEXT_MAX + 1)))
        assertEquals(BookingsDefaults.REASON_TEXT_MAX, (viewModel.state.first().dialog as DetailsDialog.Reason).text.length)
        viewModel.onEvent(UiAction.OnReasonText("Closed today"))
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertEquals(listOf("reject:OTHER:Closed today"), repository.actions)
        assertNull(viewModel.state.first().dialog)
    }

    @Test
    fun alreadyHandledShowsThePopupAndRefreshesWithoutRetrying() = runTest(UnconfinedTestDispatcher()) {
        repository.actionResult = serverError(ErrorCode.ALREADY_HANDLED)
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnActionClick(BookingAction.APPROVE))
        assertEquals(DetailsDialog.AlreadyHandled, viewModel.state.first().dialog)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        assertEquals(1, repository.actions.size)
        assertEquals(2, repository.detailsCalls)
    }

    @Test
    fun scheduleConflictClosesTheSheetAndRefreshesButOtherErrorsKeepIt() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        repository.actionResult = AppResult.Error(AppError.NetworkError("offline"))
        viewModel.onEvent(UiAction.OnActionClick(BookingAction.COMPLETE))
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertIs<DetailsDialog.Confirm>(viewModel.state.first().dialog)
        assertEquals(1, repository.detailsCalls)
        repository.actionResult = serverError(ErrorCode.SCHEDULE_CONFLICT)
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertNull(viewModel.state.first().dialog)
        assertEquals(2, repository.detailsCalls)
    }

    @Test
    fun reassignOffersTheServersEligibleStaffAndSendsThePersonAndStaff() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnActionClick(BookingAction.REASSIGN))
        val dialog = viewModel.state.first().dialog as DetailsDialog.Reassign
        assertEquals(listOf(0), repository.eligibleCalls)
        assertEquals(listOf(LINA), dialog.eligible, "eligible-staff answer without the person's current provider (Sara)")
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertTrue(repository.actions.isEmpty())
        viewModel.onEvent(UiAction.OnReassignStaff(LINA.id))
        viewModel.onEvent(UiAction.OnDialogConfirm)
        assertEquals(listOf("reassign:0:s2"), repository.actions)
        assertEquals(SideEffect.ShowMessage(ActionMessage.REASSIGNED), effects.last())
    }

    @Test
    fun anotherPersonReloadsItsEligibleStaffAndAFailureIsShownAsSuch() = runTest(UnconfinedTestDispatcher()) {
        // e2e: the team list offered a member the server refused; now every person asks the server.
        repository.eligibleByPerson[1] = emptyList()
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnActionClick(BookingAction.REASSIGN))
        viewModel.onEvent(UiAction.OnReassignStaff(LINA.id))
        viewModel.onEvent(UiAction.OnReassignPerson(1))
        val second = viewModel.state.first().dialog as DetailsDialog.Reassign
        assertEquals(listOf(0, 1), repository.eligibleCalls)
        assertEquals(true, second.eligible?.isEmpty(), "nobody qualified and free")
        assertNull(second.staffId, "the choice of another person is not carried over")
        assertTrue(!second.failed)
        viewModel.onEvent(UiAction.OnReassignPerson(2))
        val failed = viewModel.state.first().dialog as DetailsDialog.Reassign
        assertTrue(failed.failed)
        assertEquals(true, failed.eligible?.isEmpty())
    }

    @Test
    fun contactAndCopyEmitEffectsAndLoadFailureShowsRetry() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnCallCustomer)
        viewModel.onEvent(UiAction.OnWhatsAppCustomer)
        viewModel.onEvent(UiAction.OnCopyReference)
        assertEquals(
            listOf(SideEffect.Dial("+962791234567"), SideEffect.WhatsApp("+962791234567"), SideEffect.CopyReference("WAB-b1")),
            effects,
        )
        repository.detailsResult = AppResult.Error(AppError.NetworkError("offline"))
        val failing = viewModel()
        assertEquals("failed", failing.state.first { !it.loading }.error)
    }
}
