package com.fab.wab.customer.core.data.contract

import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class OperationPathTest {

    @Test
    fun fillsEveryPathParam() {
        val op = CustomerOperations.putFavoritesBySalonId
        assertEquals(op.path.replace("{salonId}", "s-1"), op.pathWith("salonId" to "s-1"))
    }

    @Test
    fun refusesUnknownOrMissingParams() {
        assertFailsWith<IllegalArgumentException> { CustomerOperations.putFavoritesBySalonId.pathWith() }
        assertFailsWith<IllegalArgumentException> { CustomerOperations.getHome.pathWith("x" to "1") }
    }
}
