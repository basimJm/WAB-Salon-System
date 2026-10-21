package com.fab.wab.customer.feature.booking.data

import com.fab.wab.customer.core.data.contract.generated.PostBookingsData
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDataMoney
import com.fab.wab.customer.feature.booking.data.repository.toDomain
import com.fab.wab.customer.feature.booking.domain.model.CreatedBooking
import kotlin.test.Test
import kotlin.test.assertEquals

class BookingMappersTest {

    @Test
    fun createdBookingKeepsIdReferenceAndStatus() {
        val dto = PostBookingsData(
            id = "b1",
            referenceNumber = "WAB-1001",
            status = "PENDING",
            paymentMethod = "PAY_ON_ARRIVAL",
            paymentStatus = "NOT_REQUIRED",
            appointmentStart = "2026-10-20T07:00:00Z",
            appointmentEnd = "2026-10-20T07:45:00Z",
            respondBy = "2026-10-20T06:00:00Z",
            money = PostBookingsDataMoney(total = "10", dueOnline = "0", paidOnline = "0", remaining = "10"),
        )
        assertEquals(CreatedBooking("b1", "WAB-1001", "PENDING"), dto.toDomain())
    }
}
