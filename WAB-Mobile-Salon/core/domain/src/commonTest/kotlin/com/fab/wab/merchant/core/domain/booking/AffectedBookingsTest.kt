package com.fab.wab.merchant.core.domain.booking

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.FieldError
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AffectedBookingsTest {

    @Test
    fun conflictIdsComeFromTheDetailsFields() {
        val error = AppError.ServerError(
            ErrorCode.SCHEDULE_CONFLICT,
            CONFLICT_STATUS,
            null,
            listOf(FieldError("b1", "SCHEDULE_CONFLICT", ""), FieldError("b1", "", ""), FieldError(" ", "", ""), FieldError("b2", "", "")),
        )
        assertEquals(listOf("b1", "b2"), error.conflictBookingIds())
        assertNull(AppError.ServerError(ErrorCode.CONFLICT, CONFLICT_STATUS, null).conflictBookingIds())
        assertNull(AppError.NetworkError("offline").conflictBookingIds())
    }

    private companion object {
        const val CONFLICT_STATUS = 409
    }
}
