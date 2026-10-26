package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.designsystem.components.format.bidiIsolate
import com.fab.wab.merchant.designsystem.components.format.filsToDecimal
import com.fab.wab.merchant.designsystem.components.format.ltrIsolate
import com.fab.wab.merchant.designsystem.components.format.oneDecimalText
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

    @Test
    fun filsBecomeDecimalText() {
        assertEquals("12.500", filsToDecimal(12_500))
        assertEquals("0.050", filsToDecimal(50))
        assertEquals("10", trimAmount(filsToDecimal(10_000)))
    }

    @Test
    fun ratingsAndRatesShowOneDecimal() {
        assertEquals("4.8", oneDecimalText(4.75))
        assertEquals("5.0", oneDecimalText(5.0))
        assertEquals("0.0", oneDecimalText(0.0))
        assertEquals("12.5", oneDecimalText(12.46))
        assertEquals("-1.5", oneDecimalText(-1.5))
    }

    @Test
    fun phonesAreIsolatedLeftToRightInsideArabicText() {
        val isolated = ltrIsolate("+962799000024")
        assertEquals('⁦', isolated.first(), "e2e: the '+' of a customer phone moved to the end in Arabic")
        assertEquals('⁩', isolated.last())
        assertEquals("+962799000024", isolated.drop(1).dropLast(1))
    }

    @Test
    fun composedLinePartsAreFirstStrongIsolates() {
        // e2e: "Dana Majali · 11:30 ص – 12:15 م" became an LTR line with the Arabic times out of order.
        val part = bidiIsolate("11:30 ص – 12:15 م")
        assertEquals('⁨', part.first())
        assertEquals('⁩', part.last())
        assertEquals("", bidiIsolate("").drop(2), "an empty part stays only the two marks")
    }
}
