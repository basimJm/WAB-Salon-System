package com.fab.wab.merchant.feature.bookings.data

import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataCustomer
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataMoney
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataPersonsItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataPersonsItemServicesItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataPersonsItemStaff
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataRejection
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdDataStatusHistoryItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItemBranch
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItemCustomer
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItemRejection
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItemStaffItem
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.feature.bookings.data.repository.toDomain
import com.fab.wab.merchant.feature.bookings.data.repository.toStaff
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

private const val START = "2026-10-22T13:00:00Z"
private const val END = "2026-10-22T14:30:00Z"
private const val PHOTO = "https://cdn.example/rana.jpg"

class BookingMappersTest {
    private val item = GetBookingsDataItem(
        id = "b1", referenceNumber = "WAB-1", status = "PENDING", paymentMethod = "DEPOSIT", paymentStatus = "DEPOSIT_PAID",
        hasBride = true, appointmentStart = START, appointmentEnd = END, respondBy = "2026-10-22T14:00:00Z", requestedAt = START,
        personsCount = 2.0, businessType = "SALON", salonAudience = "FEMALE",
        total = "45.000", customer = GetBookingsDataItemCustomer("c1", "Sara", "+962791234567"),
        staff = listOf(GetBookingsDataItemStaffItem("s1", "Rana Odeh", "Rana", PHOTO)),
    )

    private val detailsData = GetBookingsByIdData(
        id = "b1", referenceNumber = "WAB-1", status = "APPROVED", paymentMethod = "PAY_ON_ARRIVAL", paymentStatus = "PAY_ON_ARRIVAL",
        hasBride = false, appointmentStart = START, appointmentEnd = END, respondBy = END, requestedAt = START, personsCount = 1.0,
        businessType = "SALON", salonAudience = "FEMALE", total = "25.000",
        customer = GetBookingsByIdDataCustomer("c1", "Noor", "+962790000000"), staff = emptyList(), refundStatus = "NONE",
        persons = listOf(
            GetBookingsByIdDataPersonsItem(
                "Noor",
                false,
                "FEMALE",
                START,
                END,
                "25.000",
                null,
                listOf(GetBookingsByIdDataPersonsItemServicesItem("Cut", "25.000", 45.0)),
            ),
        ),
        money = GetBookingsByIdDataMoney("25.000", "0.000", "0.000", "25.000", "0.000", "0.000"),
        policy = JsonObject(mapOf("cancellationWindowHours" to JsonPrimitive(24))),
        statusHistory = listOf(GetBookingsByIdDataStatusHistoryItem("APPROVED", "MEMBER", null, START)),
        createdAt = START, actions = listOf("CANCEL", "REASSIGN", "UNKNOWN_ACTION"),
    )

    @Test
    fun listItemsMapAndBadStartsAreDropped() {
        val summary = item.toDomain()
        assertEquals(BookingStatus.PENDING, summary?.status)
        assertEquals(PaymentStatus.DEPOSIT_PAID, summary?.paymentStatus)
        assertEquals(2, summary?.personsCount)
        assertEquals("Rana Odeh", summary?.staff?.single()?.name)
        assertEquals(PHOTO, summary?.staff?.single()?.photoUrl)
        assertNull(item.copy(appointmentStart = "soon").toDomain())
    }

    @Test
    fun listRowsWithARejectionAndStaffWithoutPhotoStillMap() {
        val rejected = item.copy(
            status = "REJECTED",
            staff = listOf(GetBookingsDataItemStaffItem("s1", "Rana Odeh", "Rana")),
            rejection = GetBookingsDataItemRejection("FULLY_BOOKED", null, START),
        ).toDomain()
        assertEquals(BookingStatus.REJECTED, rejected?.status)
        assertNull(rejected?.staff?.single()?.photoUrl)
    }

    @Test
    fun detailsCarryPersonsMoneyHistoryAndActions() {
        val details = detailsData.toDomain()
        assertEquals(setOf(BookingAction.CANCEL, BookingAction.REASSIGN), details?.actions)
        assertEquals(45, details?.persons?.single()?.services?.single()?.durationMinutes)
        assertEquals("25.000", details?.money?.remaining)
        assertEquals(false, details?.money?.hasPaidAtSalon)
        assertEquals(24, details?.policy?.windowHours)
        assertEquals(BookingStatus.APPROVED, details?.history?.single()?.status)
    }

    @Test
    fun completedDetailsCarryPaidAtSalonAndPersonStaffPhoto() {
        val details = detailsData.copy(
            status = "COMPLETED",
            persons = detailsData.persons.map { it.copy(staff = GetBookingsByIdDataPersonsItemStaff("s1", "Rana Odeh", "Rana", PHOTO)) },
            money = GetBookingsByIdDataMoney("25.000", "5.000", "5.000", "0.000", "20.000", "0.000"),
        ).toDomain()
        assertEquals("20.000", details?.money?.paidAtSalon)
        assertEquals("0.000", details?.money?.remaining)
        assertEquals(true, details?.money?.hasPaidAtSalon)
        assertEquals(false, details?.money?.hasRefund)
        assertEquals(PHOTO, details?.persons?.single()?.staff?.photoUrl)
        assertEquals("Rana Odeh", details?.persons?.single()?.staff?.name)
    }

    @Test
    fun aCodeOnlyRejectionKeepsTheCodeForTheAppLanguageText() {
        val codeOnly = detailsData.copy(status = "REJECTED", rejection = GetBookingsByIdDataRejection("FULLY_BOOKED", null, START))
            .toDomain()
        assertNull(codeOnly?.rejectionReason, "e2e: the raw code FULLY_BOOKED was shown as the reason")
        assertEquals("FULLY_BOOKED", codeOnly?.rejectionCode)
        assertEquals(ResponseReason.FULLY_BOOKED, ResponseReason.fromCode(codeOnly?.rejectionCode))
        val typed = detailsData.copy(status = "REJECTED", rejection = GetBookingsByIdDataRejection("OTHER", "Closed today", START))
            .toDomain()
        assertEquals("Closed today", typed?.rejectionReason)
        assertNull(ResponseReason.fromCode("CUSTOMER_REQUEST"))
    }

    @Test
    fun teamMembersBecomeStaffWithFullNames() {
        val member = GetTeamMembersDataItem("m1", "Rana", "Odeh", "+962", null, "EMPLOYEE", emptyList(), true, true)
        assertEquals("Rana Odeh", member.toStaff().name)
        assertEquals("b2", member.copy(branchId = "b2").toStaff().branchId)
    }

    @Test
    fun bookingBranchIsMappedWithBlankAddressDropped() {
        val summary = item.copy(branch = GetBookingsDataItemBranch("b1", "Abdoun", " ")).toDomain()
        assertEquals("Abdoun", summary?.branch?.name)
        assertNull(summary?.branch?.locationText)
        assertNull(item.toDomain()?.branch)
    }
}
