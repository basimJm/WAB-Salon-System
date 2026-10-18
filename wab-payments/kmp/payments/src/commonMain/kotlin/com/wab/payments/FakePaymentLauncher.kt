package com.wab.payments

/** What a [FakePaymentLauncher] answers with. */
public enum class FakeOutcome { COMPLETED, CANCELLED, FAILED }

/**
 * Scriptable launcher for previews, unit tests and the dev flow without any gateway. It records
 * every session it was asked to open. Not thread-safe; use it from one test coroutine.
 */
public class FakePaymentLauncher(
    public var outcome: FakeOutcome = FakeOutcome.COMPLETED,
    public var failure: PaymentError = PaymentError.sdk("FAKE", "Scripted failure"),
) : PaymentLauncher {
    private val seen = mutableListOf<CheckoutSession>()

    /** Sessions launched so far, oldest first. */
    public val launched: List<CheckoutSession> get() = seen.toList()

    override suspend fun launch(session: CheckoutSession): PaymentResult {
        seen += session
        return when (outcome) {
            FakeOutcome.COMPLETED -> PaymentResult.ClientCompleted(session.sessionId, "/fake/${session.checkoutId}/payment")
            FakeOutcome.CANCELLED -> PaymentResult.Cancelled(session.sessionId)
            FakeOutcome.FAILED -> PaymentResult.Failed(session.sessionId, failure)
        }
    }
}
