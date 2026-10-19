package com.wab.payments

/**
 * What the device saw. It is never the final word: the app must call its server's verify endpoint
 * before treating any payment as paid (a booking is created only after the server confirms).
 */
public sealed interface PaymentResult {
    public val sessionId: String

    /**
     * The gateway UI finished and handed control back. This does NOT mean the payment succeeded;
     * [resourcePath] is the gateway's pointer to the outcome (informational).
     */
    public data class ClientCompleted(
        override val sessionId: String,
        val resourcePath: String? = null,
    ) : PaymentResult

    /** The shopper left the payment UI without finishing. */
    public data class Cancelled(override val sessionId: String) : PaymentResult

    public data class Failed(
        override val sessionId: String,
        val error: PaymentError,
    ) : PaymentResult
}
