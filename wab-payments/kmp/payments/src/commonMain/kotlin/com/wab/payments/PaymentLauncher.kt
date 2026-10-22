package com.wab.payments

import kotlinx.coroutines.CancellationException

/**
 * Opens the gateway's payment UI for a server-created [CheckoutSession] and reports what the
 * device saw. One port for every gateway and platform: a gateway change swaps the implementation,
 * never the app code. Implementations must not throw (except for coroutine cancellation).
 */
public fun interface PaymentLauncher {
    public suspend fun launch(session: CheckoutSession): PaymentResult
}

/** The checkout-oriented name of the same port. */
public typealias CheckoutLauncher = PaymentLauncher

/**
 * Routes a session to the launcher registered for its provider, after validating it. Anything a
 * launcher throws becomes a typed [PaymentResult.Failed]; the app never sees a raw exception.
 */
public class DelegatingPaymentLauncher(
    private val launchers: Map<String, PaymentLauncher>,
) : PaymentLauncher {
    override suspend fun launch(session: CheckoutSession): PaymentResult {
        session.validationError()?.let { return PaymentResult.Failed(session.sessionId, it) }
        val launcher = launchers[session.provider]
            ?: return PaymentResult.Failed(session.sessionId, PaymentError.unsupportedProvider(session.provider))
        return try {
            launcher.launch(session)
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (@Suppress("TooGenericExceptionCaught") failure: Throwable) {
            PaymentResult.Failed(session.sessionId, PaymentError.unknown(failure.message))
        }
    }
}
