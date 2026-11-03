package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseAction
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseBookingUseCase
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseOutcome
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** MER-086 (BUSINESS_DOMAIN §5.21): Completed / No-show from a close reminder. */
class CloseBookingUseCaseTest {
    private val repository = FakeBookingsRepository()
    private val close = CloseBookingUseCase(repository)
    private val closable = setOf(BookingAction.COMPLETE, BookingAction.NO_SHOW, BookingAction.CANCEL)

    @Test
    fun allowedActionsRunAndReportDone() = runTest {
        repository.detailsResult = AppResult.Success(details(actions = closable, status = BookingStatus.APPROVED))
        assertEquals(CloseOutcome.Done(CloseAction.COMPLETED), close("b1", CloseAction.COMPLETED))
        assertEquals(CloseOutcome.Done(CloseAction.NO_SHOW), close("b1", CloseAction.NO_SHOW))
        assertEquals(listOf("complete", "noShow"), repository.actions)
    }

    @Test
    fun notAllowedOpensTheDetailsWithoutCallingTheServer() = runTest {
        // e.g. a member without BOOKINGS_OPERATE who is not the booking's staff: the server sends no COMPLETE.
        repository.detailsResult = AppResult.Success(details(actions = emptySet(), status = BookingStatus.APPROVED))
        assertEquals(CloseOutcome.OpenDetails, close("b1", CloseAction.COMPLETED))
        assertTrue(repository.actions.isEmpty())
    }

    @Test
    fun alreadyClosedBookingsAreReportedNotRetried() = runTest {
        repository.detailsResult = AppResult.Success(details(actions = emptySet(), status = BookingStatus.COMPLETED))
        assertEquals(CloseOutcome.AlreadyClosed, close("b1", CloseAction.NO_SHOW))
        repository.detailsResult = AppResult.Success(details(actions = closable, status = BookingStatus.APPROVED))
        repository.actionResult = serverError(ErrorCode.ALREADY_HANDLED)
        assertEquals(CloseOutcome.AlreadyClosed, close("b1", CloseAction.COMPLETED))
        assertEquals(listOf("complete"), repository.actions)
    }

    @Test
    fun failuresFallBackToTheDetails() = runTest {
        repository.detailsResult = AppResult.Error(AppError.NetworkError("offline"))
        assertEquals(CloseOutcome.OpenDetails, close("b1", CloseAction.COMPLETED))
        repository.detailsResult = AppResult.Success(details(actions = closable, status = BookingStatus.APPROVED))
        repository.actionResult = serverError(ErrorCode.TOO_EARLY_TO_COMPLETE)
        assertEquals(CloseOutcome.OpenDetails, close("b1", CloseAction.COMPLETED))
    }

    @Test
    fun codesParse() {
        assertEquals(CloseAction.NO_SHOW, CloseAction.fromCode(" NO_SHOW"))
        assertEquals(null, CloseAction.fromCode("NOPE"))
    }
}
