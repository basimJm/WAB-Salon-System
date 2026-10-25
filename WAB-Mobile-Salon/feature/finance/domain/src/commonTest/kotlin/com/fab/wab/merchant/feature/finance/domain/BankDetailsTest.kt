package com.fab.wab.merchant.feature.finance.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class BankDetailsTest {

    /** The ISO 13616 example IBAN for Jordan. */
    private val valid = "JO94CBJO0010000000000131000302"

    @Test
    fun jordanIbanChecksum() {
        assertTrue(isValidIban(valid))
        assertTrue(isValidIban("jo94 cbjo 0010 0000 0000 0131 0003 02"))
        assertFalse(isValidIban("JO95CBJO0010000000000131000302"))
        assertFalse(isValidIban("GB82WEST12345698765432"))
        assertFalse(isValidIban("JO94CBJO001000000000013100030"))
    }

    @Test
    fun formRules() {
        assertTrue(bankErrors(BankDraft("Arab Bank", "Lina Salon", valid)).isEmpty())
        assertEquals(setOf(BankField.BANK_NAME, BankField.HOLDER, BankField.IBAN), bankErrors(BankDraft(" ", "", "JO00")))
    }
}
