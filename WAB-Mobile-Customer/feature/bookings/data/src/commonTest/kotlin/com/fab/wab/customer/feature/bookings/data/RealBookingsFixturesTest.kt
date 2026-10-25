package com.fab.wab.customer.feature.bookings.data

import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.customer.core.data.contract.generated.PostBookingsByIdCancelData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.feature.bookings.data.repository.toDomain
import kotlinx.serialization.builtins.ListSerializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** CUS-060: bookings list / details / cancel captured from the local real stack map without unknown enums. */
class RealBookingsFixturesTest {

    @Test
    fun realBookingsListMapsStatusesBranchAndMeta() {
        val response = decodeFixture("GetBookings", ListSerializer(GetBookingsDataItem.serializer()))
        assertNotNull(response.meta)
        val bookings = response.data.map { it.toDomain() }
        assertTrue(bookings.isNotEmpty())
        bookings.forEach { booking ->
            assertNotEquals(BookingStatus.UNKNOWN, booking.status, booking.referenceNumber)
            assertNotEquals(PaymentMethod.UNKNOWN, booking.paymentMethod)
            assertNotEquals(PaymentStatus.UNKNOWN, booking.paymentStatus)
        }
    }

    @Test
    fun realBookingDetailsMapPersonsMoneyPolicyAndBranch() {
        val details = decodeFixture("GetBookingsById", GetBookingsByIdData.serializer()).data.toDomain()
        assertNotEquals(BookingStatus.UNKNOWN, details.status)
        assertNotEquals(RefundStatus.UNKNOWN, details.refundStatus)
        assertNotNull(details.branch, "booked branch")
        assertTrue(details.persons.isNotEmpty() && details.persons.all { it.start.isNotBlank() && it.end.isNotBlank() })
        assertTrue(details.money.total.toDouble() > 0)
        val policy = assertNotNull(details.policy, "the snapshotted policy parses")
        assertTrue(policy.paymentOptions.isNotEmpty())
    }

    @Test
    fun realCancelAnswerIsTheCustomerCancellation() {
        val cancelled = decodeFixture("PostBookingsByIdCancel", PostBookingsByIdCancelData.serializer()).data
        assertEquals(BookingStatus.CANCELLED_BY_CUSTOMER, BookingStatus.fromCode(cancelled.status))
    }
}
