package com.fab.wab.merchant.core.data.contract

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class OperationPathTest {

    @Test
    fun fillsEveryPathParam() {
        val op = MerchantOperations.getBookingsById
        assertEquals(op.path.replace("{id}", "b-1"), op.pathWith("id" to "b-1"))
    }

    @Test
    fun refusesUnknownOrMissingParams() {
        assertFailsWith<IllegalArgumentException> { MerchantOperations.getBookingsById.pathWith() }
        assertFailsWith<IllegalArgumentException> { MerchantOperations.getSalon.pathWith("x" to "1") }
    }
}
