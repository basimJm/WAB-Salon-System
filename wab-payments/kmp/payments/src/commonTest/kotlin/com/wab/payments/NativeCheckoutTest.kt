package com.wab.payments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlinx.coroutines.test.runTest

class NativeCheckoutTest {
    private class ScriptedBridge(private val outcomes: List<NativeOutcome>) : NativeCheckoutBridge {
        var request: NativeCheckoutRequest? = null

        override fun present(request: NativeCheckoutRequest, completion: (NativeOutcome) -> Unit) {
            this.request = request
            // A misbehaving SDK may call back more than once: only the first call counts.
            outcomes.forEach(completion)
        }
    }

    @Test
    fun passesOnlyWhatTheSdkNeedsAndMapsAFinishedCheckout() = runTest {
        val bridge = ScriptedBridge(listOf(NativeOutcome.Finished("/v1/checkouts/chk-1/payment"), NativeOutcome.Cancelled))
        val result = NativeCheckoutLauncher(bridge).launch(session())
        assertEquals(PaymentResult.ClientCompleted("chk-1", "/v1/checkouts/chk-1/payment"), result)
        assertEquals(
            NativeCheckoutRequest("chk-1", listOf("VISA", "MASTER"), "wab://payment/result", PaymentEnvironment.DEV),
            bridge.request,
        )
    }

    @Test
    fun readsTheResourcePathFromARedirectUrlWhenTheSdkHasNone() {
        val outcome = NativeOutcome.Finished(null, "wab://payment/result?resourcePath=%2Fp")
        assertEquals(PaymentResult.ClientCompleted("s", "/p"), outcome.toResult("s"))
        assertEquals(PaymentResult.ClientCompleted("s", null), NativeOutcome.Finished(null, null).toResult("s"))
    }

    @Test
    fun mapsCancellationAndErrors() = runTest {
        assertEquals(
            PaymentResult.Cancelled("chk-1"),
            NativeCheckoutLauncher(ScriptedBridge(listOf(NativeOutcome.Cancelled))).launch(session()),
        )
        val failed = assertIs<PaymentResult.Failed>(
            NativeCheckoutLauncher(
                ScriptedBridge(listOf(NativeOutcome.Error("E42", "bad 4111111111111111", retryable = true))),
            ).launch(session()),
        )
        assertEquals(PaymentErrorCode.SDK, failed.error.code)
        assertEquals("E42", failed.error.sdkCode)
        assertEquals("bad [redacted]", failed.error.message)
        assertEquals(true, failed.error.retryable)
    }

    @Test
    fun neverOpensTheSdkForAnInvalidSession() = runTest {
        val bridge = ScriptedBridge(listOf(NativeOutcome.Cancelled))
        val result = NativeCheckoutLauncher(bridge).launch(session(brands = emptyList()))
        assertIs<PaymentResult.Failed>(result)
        assertEquals(null, bridge.request)
    }
}
