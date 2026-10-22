package com.fab.wab.merchant.feature.bookings.data

import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataCustomer
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataMoney
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataPersonsItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataPersonsItemServicesItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataStatusHistoryItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItemCustomer
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItemStaffItem
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.feature.bookings.data.repository.toDomain
import com.fab.wab.merchant.feature.bookings.data.repository.toStaff
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

private const val START = "2026-10-22T13:00:00Z"
private const val END = "2026-10-22T14:30:00Z"

class BookingMappersTest {
    private val item = GetBookingsDataItem(
        id = "b1", referenceNumber = "WAB-1", status = "PENDING", paymentMethod = "DEPOSIT", paymentStatus = "DEPOSIT_PAID",
        hasBride = true, appointmentStart = START, appointmentEnd = END, respondBy = "2026-10-22T14:00:00Z", personsCount = 2.0,
        total = "45.000", customer = GetBookingsDataItemCustomer("c1", "Sara", "+962791234567"),
        staff = listOf(GetBookingsDataItemStaffItem("s1", "Rana")),
    )

    @Test
    fun listItemsMapAndBadStartsAreDropped() {
        val summary = item.toDomain()
        assertEquals(BookingStatus.PENDING, summary?.status)
        assertEquals(PaymentStatus.DEPOSIT_PAID, summary?.paymentStatus)
        assertEquals(2, summary?.personsCount)
        assertEquals("Rana", summary?.staff?.single()?.name)
        assertNull(item.copy(appointmentStart = "soon").toDomain())
    }

    @Test
    fun detailsCarryPersonsMoneyHistoryAndActions() {
        val details = GetBookingsByIdData(
            id = "b1", referenceNumber = "WAB-1", status = "APPROVED", paymentMethod = "PAY_ON_ARRIVAL", paymentStatus = "PAY_ON_ARRIVAL",
            hasBride = false, appointmentStart = START, appointmentEnd = END, respondBy = END, personsCount = 1.0, total = "25.000",
            customer = GetBookingsByIdDataCustomer("c1", "Noor", "+962790000000"), staff = emptyList(), refundStatus = "NONE",
            persons = listOf(
                GetBookingsByIdDataPersonsItem("Noor", false, START, END, "25.000", null, listOf(GetBookingsByIdDataPersonsItemServicesItem("Cut", "25.000", 45.0))),
            ),
            money = GetBookingsByIdDataMoney("25.000", "0.000", "0.000", "25.000", "0.000"),
            policy = JsonObject(mapOf("cancellationWindowHours" to JsonPrimitive(24))),
            statusHistory = listOf(GetBookingsByIdDataStatusHistoryItem("APPROVED", "MEMBER", null, START)),
            createdAt = START, actions = listOf("CANCEL", "REASSIGN", "UNKNOWN_ACTION"),
        ).toDomain()
        assertEquals(setOf(BookingAction.CANCEL, BookingAction.REASSIGN), details?.actions)
        assertEquals(45, details?.persons?.single()?.services?.single()?.durationMinutes)
        assertEquals("25.000", details?.money?.remaining)
        assertEquals("24", details?.policy?.get("cancellationWindowHours"))
        assertEquals(BookingStatus.APPROVED, details?.history?.single()?.status)
    }

    @Test
    fun teamMembersBecomeStaffWithFullNames() {
        val member = GetTeamMembersDataItem("m1", "Rana", "Odeh", "+962", null, "EMPLOYEE", emptyList(), true, true)
        assertEquals("Rana Odeh", member.toStaff().name)
    }
}
