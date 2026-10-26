package com.fab.wab.merchant.feature.bookings.data

import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsCalendarDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.core.domain.policy.PolicyRule
import com.fab.wab.merchant.core.domain.policy.customerRules
import com.fab.wab.merchant.feature.bookings.data.repository.toDomain
import com.fab.wab.merchant.feature.bookings.data.repository.toPolicyTerms
import com.fab.wab.merchant.feature.bookings.domain.model.isZeroAmount
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** MER-054: the bookings mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealBookingsFixturesTest {

    @Test
    fun everyListRowMapsWithItsBranch() {
        val rows = decodeFixture("GetBookings", serializer<List<GetBookingsDataItem>>()).data
        assertTrue(rows.isNotEmpty())
        val mapped = rows.mapNotNull { it.toDomain() }
        assertEquals(rows.map { it.id }, mapped.map { it.id })
        assertTrue(mapped.all { it.branch != null && it.customerName.isNotBlank() })
    }

    @Test
    fun detailsMapActionsAndThePolicySnapshotIntoRules() {
        val raw = decodeFixture("GetBookingsById", serializer<GetBookingsByIdData>()).data
        val details = assertNotNull(raw.toDomain())
        assertEquals(raw.actions.toSet(), details.actions.map { it.name }.toSet(), "every server action is known")
        assertEquals(raw.persons.size, details.persons.size)
        val terms = assertNotNull(details.policy)
        val window = (raw.policy["cancellationWindowHours"] as JsonPrimitive).intOrNull
        assertEquals(window, terms.windowHours)
        val rules = terms.customerRules()
        assertTrue(rules.isNotEmpty())
        assertTrue(PolicyRule.Window(assertNotNull(window)) in rules)
    }

    @Test
    fun completedDetailsOweNothingAndCarryWhatWasPaidAtTheSalonAndStaffPhotos() {
        val raw = decodeFixture("GetBookingsById", serializer<GetBookingsByIdData>()).data
        val details = assertNotNull(raw.toDomain())
        assertEquals("COMPLETED", raw.status, "the 1.6.0 capture is a completed booking")
        assertEquals(raw.money.paidAtSalon, details.money.paidAtSalon)
        assertTrue(details.money.hasPaidAtSalon)
        assertTrue(isZeroAmount(details.money.remaining), "remaining = still owed, 0 once final (contract 1.6.0)")
        val staff = details.persons.mapNotNull { it.staff }
        assertTrue(staff.isNotEmpty() && staff.all { it.photoUrl.orEmpty().startsWith("https://") })
    }

    @Test
    fun policySnapshotKeepsOnlyKnownCodesAndAnEmptySnapshotIsNone() {
        val snapshot = JsonObject(
            mapOf(
                "cancellationWindowHours" to JsonPrimitive(12),
                "paymentOptions" to JsonArray(listOf(JsonPrimitive("DEPOSIT"), JsonPrimitive("CRYPTO"))),
                "depositPercentage" to JsonPrimitive(30),
                "depositRefundableOnCustomerCancel" to JsonPrimitive(false),
                "noShowDeposit" to JsonPrimitive("SOMETHING_NEW"),
            ),
        )
        val rules = assertNotNull(snapshot.toPolicyTerms()).customerRules()
        assertEquals(
            listOf(PolicyRule.Window(12), PolicyRule.Deposit(30), PolicyRule.DepositOnCancel(false)),
            rules,
        )
        assertNull(JsonObject(emptyMap()).toPolicyTerms())
    }

    @Test
    fun calendarEntriesAndSalonHoursMap() {
        val entries = decodeFixture("GetBookingsCalendar", serializer<List<GetBookingsCalendarDataItem>>()).data
        assertEquals(entries.size, entries.mapNotNull { it.toDomain() }.size)
        val hours = decodeFixture("GetSalonHours", serializer<GetSalonHoursData>()).data.toDomain()
        assertTrue(hours.weekly.isNotEmpty())
    }
}
