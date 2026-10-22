package com.wab.payments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ShopperResultTest {
    private val s = session()

    @Test
    fun recognisesTheReturnUrlIgnoringQueryFragmentCaseAndTrailingSlash() {
        assertTrue(ShopperResult.isReturn("wab://payment/result?id=1#x", "wab://payment/result"))
        assertTrue(ShopperResult.isReturn("WAB://payment/result/", "wab://payment/result"))
        assertFalse(ShopperResult.isReturn("wab://payment/other", "wab://payment/result"))
        assertFalse(ShopperResult.isReturn("https://x.example.com/result", "wab://payment/result"))
    }

    @Test
    fun parsesResourcePathAndDecodesIt() {
        val url = "wab://payment/result?id=chk-1&resourcePath=%2Fv1%2Fcheckouts%2Fchk-1%2Fpayment"
        val result = ShopperResult.parse(s, url)
        assertEquals(PaymentResult.ClientCompleted("chk-1", "/v1/checkouts/chk-1/payment"), result)
    }

    @Test
    fun completedWithoutResourcePathWhenAbsent() {
        assertEquals(PaymentResult.ClientCompleted("chk-1", null), ShopperResult.parse(s, "wab://payment/result"))
        assertEquals(PaymentResult.ClientCompleted("chk-1", null), ShopperResult.parse(s, "wab://payment/result?id=chk-1"))
    }

    @Test
    fun refusesAReturnForAnotherCheckout() {
        val result = ShopperResult.parse(s, "wab://payment/result?id=other&resourcePath=%2Fx")
        val failed = assertIs<PaymentResult.Failed>(result)
        assertEquals(PaymentErrorCode.INVALID_SESSION, failed.error.code)
    }

    @Test
    fun ignoresUnrelatedUrls() {
        assertNull(ShopperResult.parse(s, "wab://elsewhere"))
    }

    @Test
    fun decodesPlusMultibyteAndBrokenEscapes() {
        val q = ShopperResult.queryOf("wab://x?a=b+c&d=%D8%B9&e=%zz&f=%4&g&=h#frag")
        assertEquals("b c", q["a"])
        assertEquals("ع", q["d"])
        assertEquals("%zz", q["e"])
        assertEquals("%4", q["f"])
        assertEquals("", q["g"])
        assertEquals("h", q[""])
        assertEquals(emptyMap(), ShopperResult.queryOf("wab://x"))
        assertEquals(emptyMap(), ShopperResult.queryOf("wab://x?"))
    }
}
