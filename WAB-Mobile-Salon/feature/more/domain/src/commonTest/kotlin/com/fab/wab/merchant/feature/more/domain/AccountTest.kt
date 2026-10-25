package com.fab.wab.merchant.feature.more.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AccountTest {
    @Test
    fun namesAreRequiredAndCappedAt50() {
        assertTrue(accountErrors("Layla", "Haddad").isEmpty())
        assertEquals(setOf(AccountField.FIRST_NAME, AccountField.LAST_NAME), accountErrors("  ", ""))
        assertEquals(setOf(AccountField.LAST_NAME), accountErrors("Layla", "x".repeat(AccountLimits.NAME_MAX + 1)))
        assertTrue(accountErrors(" Layla ", "x".repeat(AccountLimits.NAME_MAX)).isEmpty())
    }
}
