package com.fab.wab.merchant.feature.bookings.domain

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.feature.bookings.domain.model.BookingFilter
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.domain.usecase.ActionFailure
import com.fab.wab.merchant.feature.bookings.domain.usecase.actionFailureOf
import com.fab.wab.merchant.feature.bookings.domain.usecase.isReasonValid
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class BookingRulesTest {
    @Test
    fun aReasonIsRequiredAndOtherNeedsText() {
        assertFalse(isReasonValid(null, "", 300))
        assertTrue(isReasonValid(ResponseReason.FULLY_BOOKED, "", 300))
        assertFalse(isReasonValid(ResponseReason.OTHER, "  ", 300))
        assertTrue(isReasonValid(ResponseReason.OTHER, "Closing early", 300))
        assertFalse(isReasonValid(ResponseReason.OTHER, "x".repeat(301), 300))
    }

    @Test
    fun conflictsAndAlreadyHandledAreRecognised() {
        fun server(code: ErrorCode) = AppError.ServerError(code, 409, null)
        assertEquals(ActionFailure.ALREADY_HANDLED, actionFailureOf(server(ErrorCode.ALREADY_HANDLED)))
        assertEquals(ActionFailure.CONFLICT, actionFailureOf(server(ErrorCode.SCHEDULE_CONFLICT)))
        assertEquals(ActionFailure.OTHER, actionFailureOf(AppError.NetworkError("offline")))
    }

    @Test
    fun filterCountsEachActiveCriterionOnce() {
        assertEquals(0, BookingFilter().activeCount)
        val filter = BookingFilter(
            from = LocalDate(2026, 10, 1),
            to = LocalDate(2026, 10, 7),
            statuses = setOf(BookingStatus.APPROVED),
            brideOnly = true,
        )
        assertEquals(3, filter.activeCount)
    }
}
