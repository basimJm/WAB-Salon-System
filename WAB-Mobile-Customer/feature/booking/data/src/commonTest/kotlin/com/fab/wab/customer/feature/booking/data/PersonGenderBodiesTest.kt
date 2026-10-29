package com.fab.wab.customer.feature.booking.data

import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.booking.data.repository.availabilityBodyOf
import com.fab.wab.customer.feature.booking.data.repository.draftBodyOf
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/** CUS-099 (contract 1.10.0, BUSINESS_DOMAIN §5.19): every person's gender goes with the draft and the availability. */
class PersonGenderBodiesTest {
    private val woman = DraftPerson(name = "Sara", serviceIds = listOf("s"), start = "2026-10-29T07:00:00Z", gender = Gender.FEMALE)
    private val man = woman.copy(name = "Omar", gender = Gender.MALE)

    @Test
    fun draftSendsEachPersonsGender() {
        val body = assertNotNull(draftBodyOf("salon", PaymentMethod.PAY_ON_ARRIVAL, listOf(woman, man)))
        assertEquals(listOf<String?>("FEMALE", "MALE"), body.persons.map { it.gender })
        assertNull(assertNotNull(draftBodyOf("salon", PaymentMethod.PAY_ON_ARRIVAL, listOf(woman.copy(gender = null)))).persons.single().gender)
    }

    @Test
    fun availabilitySendsTheCurrentPersonsGender() {
        assertEquals("MALE", availabilityBodyOf("2026-10-29", man, emptyList(), draftId = null).person.gender)
    }
}
