package com.wab.payments

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CheckoutSessionTest {
    @Test
    fun wellFormedSessionHasNoError() {
        assertNull(session().validationError())
        assertEquals("JOD", session().currency)
    }

    @Test
    fun everyMalformedFieldIsReported() {
        val bad = listOf(
            session(provider = " "),
            session(sessionId = ""),
            session(checkoutId = ""),
            session(brands = emptyList()),
            session(brands = listOf("VISA", " ")),
            session(shopperResultUrl = ""),
            session(shopperResultUrl = "not a url"),
            session(amountFils = 0),
            session(amountFils = -5),
        )
        bad.forEach { candidate ->
            val error = candidate.validationError()
            assertEquals(PaymentErrorCode.INVALID_SESSION, error?.code, candidate.toString())
            assertEquals(false, error?.retryable)
        }
    }

    @Test
    fun environmentParsesServerValues() {
        assertEquals(PaymentEnvironment.DEV, PaymentEnvironment.fromServer("dev"))
        assertEquals(PaymentEnvironment.PROD, PaymentEnvironment.fromServer(" PROD "))
        assertNull(PaymentEnvironment.fromServer("staging"))
    }
}
