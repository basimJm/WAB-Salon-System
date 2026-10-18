package com.wab.payments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertIs
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest

class LauncherTest {
    @Test
    fun fakeLauncherFollowsItsScriptAndRecordsSessions() = runTest {
        val fake = FakePaymentLauncher()
        assertEquals(PaymentResult.ClientCompleted("chk-1", "/fake/chk-1/payment"), fake.launch(session()))
        fake.outcome = FakeOutcome.CANCELLED
        assertEquals(PaymentResult.Cancelled("chk-1"), fake.launch(session()))
        fake.outcome = FakeOutcome.FAILED
        val failed = assertIs<PaymentResult.Failed>(fake.launch(session(sessionId = "s2")))
        assertEquals("s2", failed.sessionId)
        assertEquals("FAKE", failed.error.sdkCode)
        assertEquals(listOf("chk-1", "chk-1", "s2"), fake.launched.map { it.sessionId })
    }

    @Test
    fun delegatingLauncherRoutesByProvider() = runTest {
        val real = FakePaymentLauncher()
        val mock = FakePaymentLauncher(FakeOutcome.CANCELLED)
        val router = DelegatingPaymentLauncher(mapOf("hyperpay" to real, "mock-gateway" to mock))
        assertIs<PaymentResult.ClientCompleted>(router.launch(session(provider = "hyperpay")))
        assertIs<PaymentResult.Cancelled>(router.launch(session(provider = "mock-gateway")))
        assertEquals(1, real.launched.size)
        assertEquals(1, mock.launched.size)
    }

    @Test
    fun delegatingLauncherRefusesUnknownProvidersAndBadSessionsWithoutLaunching() = runTest {
        val fake = FakePaymentLauncher()
        val router = DelegatingPaymentLauncher(mapOf("hyperpay" to fake))
        val unknown = assertIs<PaymentResult.Failed>(router.launch(session(provider = "tap")))
        assertEquals(PaymentErrorCode.UNSUPPORTED_PROVIDER, unknown.error.code)
        val invalid = assertIs<PaymentResult.Failed>(router.launch(session(checkoutId = "")))
        assertEquals(PaymentErrorCode.INVALID_SESSION, invalid.error.code)
        assertEquals(0, fake.launched.size)
    }

    @Test
    fun delegatingLauncherTurnsExceptionsIntoTypedFailuresButKeepsCancellation() = runTest {
        val crashing = PaymentLauncher { error("boom 4111111111111111") }
        val failed = assertIs<PaymentResult.Failed>(
            DelegatingPaymentLauncher(mapOf("hyperpay" to crashing)).launch(session()),
        )
        assertEquals(PaymentErrorCode.UNKNOWN, failed.error.code)
        assertEquals("boom [redacted]", failed.error.message)
        val cancelling = PaymentLauncher { throw CancellationException("stop") }
        assertFailsWith<CancellationException> {
            DelegatingPaymentLauncher(mapOf("hyperpay" to cancelling)).launch(session())
        }
    }
}
