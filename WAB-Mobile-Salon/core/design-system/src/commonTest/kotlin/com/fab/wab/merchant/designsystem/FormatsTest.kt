package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.designsystem.components.format.trimAmount
import kotlin.test.Test
import kotlin.test.assertEquals

class FormatsTest {
    @Test
    fun amountsDropTrailingZeros() {
        assertEquals("25", trimAmount("25.000"))
        assertEquals("12.5", trimAmount("12.500"))
        assertEquals("100", trimAmount(" 100 "))
        assertEquals("0", trimAmount("0.000"))
    }
}
