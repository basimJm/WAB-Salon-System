package com.fab.wab.merchant.feature.bookings.data

import com.fab.wab.merchant.core.data.contract.generated.GetCustomersLookupData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsData
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsDataMoney
import com.fab.wab.merchant.feature.bookings.data.repository.toBody
import com.fab.wab.merchant.feature.bookings.data.repository.toDomain
import com.fab.wab.merchant.feature.bookings.data.repository.toOption
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerGender
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingCustomer
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingPerson
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRequest
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRules
import com.fab.wab.merchant.feature.bookings.domain.model.PhoneNumber
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** MER-085: `POST /bookings` body and the lookup / services / created mappings (BUSINESS_DOMAIN §5.20). */
class NewBookingMappersTest {
    private val amman = TimeZone.of("Asia/Amman")
    private val phone = PhoneNumber("JO", "791234567")

    private fun person(staffId: String? = null, key: String? = null) = NewBookingPerson(
        name = " Rana ",
        gender = CustomerGender.FEMALE,
        serviceIds = listOf("sv1", "sv2"),
        staffId = staffId,
        start = NewBookingRules.slotStart(LocalDate(2026, 11, 5), 14 * 60 + 30, amman),
        referenceImageKey = key,
    )

    @Test
    fun unregisteredCustomerSendsNameGenderAndUtcStart() {
        val body = NewBookingRequest("b1", NewBookingCustomer(phone, " Walk-in ", CustomerGender.MALE), listOf(person())).toBody()
        assertEquals("b1", body.branchId)
        assertEquals("JO", body.customer.phone.countryCode)
        assertEquals("791234567", body.customer.phone.number)
        assertEquals("Walk-in", body.customer.name)
        assertEquals("MALE", body.customer.gender)
        val sent = body.persons.single()
        assertEquals("Rana", sent.name)
        assertEquals("FEMALE", sent.gender)
        assertEquals(listOf("sv1", "sv2"), sent.serviceIds)
        // 14:30 in Amman (UTC+3) is 11:30 UTC.
        assertEquals("2026-11-05T11:30:00Z", sent.start)
        assertNull(sent.staffId, "any available staff sends no staff id")
        assertNull(sent.referenceImageKey)
    }

    @Test
    fun registeredCustomerSendsThePhoneOnlyAndAChosenStaff() {
        val body = NewBookingRequest(null, NewBookingCustomer(phone, " ", null), listOf(person("st1", "uploads/design.jpg"))).toBody()
        assertNull(body.branchId)
        assertNull(body.customer.name)
        assertNull(body.customer.gender)
        assertEquals("st1", body.persons.single().staffId)
        assertEquals("uploads/design.jpg", body.persons.single().referenceImageKey)
    }

    @Test
    fun lookupServicesAndCreatedMap() {
        val registered = GetCustomersLookupData(true, "Rana", "FEMALE").toDomain()
        assertEquals(CustomerGender.FEMALE, registered.gender)
        assertEquals("Rana", registered.firstName)
        val unknown = GetCustomersLookupData(false, " ", null).toDomain()
        assertNull(unknown.firstName)
        assertNull(unknown.gender)
        val option = GetSalonServicesDataItem("sv1", "c1", "Haircut", "", "18.000", 45.0, false, null, emptyList(), true).toOption()
        assertEquals(45, option.durationMinutes)
        assertEquals("18.000", option.price)
        val created = PostBookingsData(
            "id-1", "WAB-1", "APPROVED", "PAY_ON_ARRIVAL", "PAY_ON_ARRIVAL", "", "", "",
            PostBookingsDataMoney("18.000", "0.000", "0.000", "18.000"), customerRegistered = false,
        ).toDomain()
        assertEquals("id-1", created.id)
        assertEquals(false, created.customerRegistered)
    }
}
