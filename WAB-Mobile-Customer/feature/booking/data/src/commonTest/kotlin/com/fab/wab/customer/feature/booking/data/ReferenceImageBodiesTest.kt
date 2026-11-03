package com.fab.wab.customer.feature.booking.data

import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.data.repository.draftBodyOf
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.DraftReferenceImage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/** CUS-104 (BUSINESS_DOMAIN §5.23): each person's design image key goes with the draft; none = no key. */
class ReferenceImageBodiesTest {
    private val person = DraftPerson(name = "Lina", serviceIds = listOf("s"), start = "2026-11-05T07:00:00Z")

    @Test
    fun draftSendsTheKeyOfEachPersonsImage() {
        val withImage = person.copy(referenceImage = DraftReferenceImage("uploads/ref-1", byteArrayOf(1)))
        val body = assertNotNull(draftBodyOf("studio", PaymentMethod.PAY_ON_ARRIVAL, listOf(withImage, person)))
        assertEquals(listOf<String?>("uploads/ref-1", null), body.persons.map { it.referenceImageKey })
    }
}
