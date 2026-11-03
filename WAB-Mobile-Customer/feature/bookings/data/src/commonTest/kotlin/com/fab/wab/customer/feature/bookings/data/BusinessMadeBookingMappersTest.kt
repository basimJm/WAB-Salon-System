package com.fab.wab.customer.feature.bookings.data

import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdDataCreatedBy
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.core.domain.booking.BookingSource
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.feature.bookings.data.repository.toDomain
import kotlinx.serialization.builtins.ListSerializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** CUS-104 (BUSINESS_DOMAIN §5.20, §5.23): `source`, the snapshotted type and each person's design image URL. */
class BusinessMadeBookingMappersTest {

    @Test
    fun listRowsCarryTheSource() {
        val row = decodeFixture("GetBookings", ListSerializer(GetBookingsDataItem.serializer())).data.first()
        assertEquals(BookingSource.CUSTOMER_APP, row.toDomain().source)
        assertEquals(BookingSource.MERCHANT, row.copy(source = "MERCHANT").toDomain().source)
        assertEquals(BusinessType.TATTOO, row.copy(businessType = "TATTOO").toDomain().businessType)
    }

    @Test
    fun detailsCarryTheSourceTypeAndEachPersonsDesignImage() {
        val data = decodeFixture("GetBookingsById", GetBookingsByIdData.serializer()).data
        val person = data.persons.first()
        val tattoo = data.copy(
            source = "MERCHANT",
            createdBy = GetBookingsByIdDataCreatedBy("m1", "Rami"),
            businessType = "TATTOO",
            persons = listOf(person.copy(referenceImageUrl = "https://signed.example/ref"), person.copy(referenceImageUrl = " ")),
        ).toDomain()
        assertEquals(BookingSource.MERCHANT, tattoo.source)
        assertEquals(BusinessType.TATTOO, tattoo.businessType)
        assertEquals(listOf("https://signed.example/ref", null), tattoo.persons.map { it.referenceImageUrl })
        assertNull(data.toDomain().persons.first().referenceImageUrl)
    }
}
