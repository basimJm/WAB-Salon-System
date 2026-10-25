package com.fab.wab.customer.feature.booking.data

import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.data.repository.availabilityBodyOf
import com.fab.wab.customer.feature.booking.data.repository.draftBodyOf
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** `POST /salons/{id}/availability` and `POST /bookings/drafts` carry the chosen branch (BUSINESS_DOMAIN §5.18). */
class BranchRequestBodiesTest {
    private val person = DraftPerson(name = "Sara", serviceIds = listOf("a"), start = "2026-10-20T07:00:00Z")

    @Test
    fun availabilityAndDraftSendTheBranch() {
        assertEquals("b2", availabilityBodyOf("2026-10-20", person, emptyList(), draftId = null, branchId = "b2").branchId)
        assertEquals("b2", draftBodyOf("s1", PaymentMethod.PAY_ON_ARRIVAL, listOf(person), branchId = "b2").branchId)
    }

    @Test
    fun singleBranchSalonsWithoutBranchesSendNone() {
        assertNull(availabilityBodyOf("2026-10-20", person, emptyList(), draftId = null).branchId)
        assertNull(draftBodyOf("s1", PaymentMethod.PAY_ON_ARRIVAL, listOf(person)).branchId)
    }
}
