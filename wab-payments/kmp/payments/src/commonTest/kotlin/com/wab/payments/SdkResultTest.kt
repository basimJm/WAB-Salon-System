package com.wab.payments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

class SdkResultTest {
    @Test
    fun completedKeepsThePathsAndDropsBlankOnes() {
        assertEquals(
            NativeOutcome.Finished("/v1/checkouts/c/payment", "wab://r"),
            sdkOutcome(SdkResultKind.COMPLETED, "/v1/checkouts/c/payment", "wab://r"),
        )
        assertEquals(NativeOutcome.Finished(null, null), sdkOutcome(SdkResultKind.COMPLETED, resourcePath = " "))
    }

    @Test
    fun canceledIsACancellation() {
        assertEquals(NativeOutcome.Cancelled, sdkOutcome(SdkResultKind.CANCELED, errorCode = "ignored"))
    }

    @Test
    fun errorsCarryTheCodeAndAreRetryableOnlyForTransientOnes() {
        val network = assertIs<NativeOutcome.Error>(sdkOutcome(SdkResultKind.ERROR, errorCode = "ERROR_NETWORK", errorMessage = "offline"))
        assertTrue(network.retryable)
        val other = assertIs<NativeOutcome.Error>(sdkOutcome(SdkResultKind.ERROR, errorCode = "ERROR_CARD", errorMessage = "bad 4111111111111111"))
        assertFalse(other.retryable)
        assertEquals("ERROR_CARD", other.sdkCode)
        // The message is scrubbed when it becomes the app-facing result.
        assertEquals("bad [redacted]", assertIs<PaymentResult.Failed>(other.toResult("s")).error.message)
        val unknown = assertIs<NativeOutcome.Error>(sdkOutcome(SdkResultKind.ERROR))
        assertFalse(unknown.retryable)
        assertEquals(null, unknown.sdkCode)
    }
}
