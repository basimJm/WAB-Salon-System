package com.wab.payments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PaymentErrorTest {
    @Test
    fun scrubMasksCardNumbersInAnyFormat() {
        assertEquals("paid with [redacted] ok", Redaction.scrub("paid with 4111111111111111 ok"))
        assertEquals("[redacted]", Redaction.scrub("4111 1111 1111 1111"))
        assertEquals("[redacted]", Redaction.scrub("4111-1111-1111-1111"))
        assertEquals("a [redacted] b [redacted]", Redaction.scrub("a 5500000000000004 b 378282246310005"))
    }

    @Test
    fun scrubKeepsShortNumbersAndText() {
        assertEquals("code 800.100.151 at 12:30", Redaction.scrub("code 800.100.151 at 12:30"))
        assertEquals("1234 5678", Redaction.scrub("1234 5678"))
        assertEquals("", Redaction.scrub(""))
        assertEquals("no digits", Redaction.scrub("no digits"))
        assertEquals("12 abc", Redaction.scrub("12 abc"))
    }

    @Test
    fun factoriesScrubAndClassify() {
        val sdk = PaymentError.sdk("E1", "card 4111111111111111 failed", retryable = true)
        assertEquals(PaymentErrorCode.SDK, sdk.code)
        assertEquals("card [redacted] failed", sdk.message)
        assertTrue(sdk.retryable)
        assertEquals("E1", sdk.sdkCode)
        assertEquals("Payment SDK error", PaymentError.sdk(null, null).message)
        assertFalse(PaymentError.sdk(null, null).retryable)
        assertEquals(PaymentErrorCode.UNKNOWN, PaymentError.unknown(null).code)
        assertEquals("Unexpected payment failure", PaymentError.unknown(null).message)
        assertEquals(PaymentErrorCode.CONFIGURATION, PaymentError.configuration("no bridge").code)
        assertEquals(PaymentErrorCode.UNSUPPORTED_PROVIDER, PaymentError.unsupportedProvider("x").code)
        assertEquals(PaymentErrorCode.INVALID_SESSION, PaymentError.invalidSession("bad").code)
    }
}
