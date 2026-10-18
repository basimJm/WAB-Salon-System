package com.wab.payments

/** Which gateway environment the checkout belongs to (the SDKs have a test and a live mode). */
public enum class PaymentEnvironment {
    DEV,
    PROD,
    ;

    public companion object {
        /** Maps the server's `environment` value (`dev` / `prod`); anything unknown is refused. */
        public fun fromServer(value: String): PaymentEnvironment? =
            entries.firstOrNull { it.name.equals(value.trim(), ignoreCase = true) }
    }
}

/**
 * What the app gets from its server (`POST /payments`, the `client` part of the `@wab/payments`
 * session) and hands to a [PaymentLauncher]. Money is integer fils; [currency] is informational.
 */
public data class CheckoutSession(
    /** Gateway adapter that produced the session: `hyperpay`, `mock-gateway` or `fake`. */
    val provider: String,
    val environment: PaymentEnvironment,
    /** The server's id for the attempt: send it back to `POST /payments/{id}/verify`. */
    val sessionId: String,
    /** The gateway checkout id the native SDK or page is opened with. */
    val checkoutId: String,
    /** Payment brands to offer, e.g. `VISA`, `MASTER`. */
    val brands: List<String>,
    /** Where the gateway returns the shopper (the app's scheme or an https URL). */
    val shopperResultUrl: String,
    val amountFils: Long,
    val currency: String = DEFAULT_CURRENCY,
    /** Hosted pay page (only the dev mock gateway has one). */
    val checkoutUrl: String? = null,
) {
    /** The first reason this session cannot be launched, or `null` when it is well formed. */
    public fun validationError(): PaymentError? {
        val problem = when {
            provider.isBlank() -> "provider is blank"
            sessionId.isBlank() -> "sessionId is blank"
            checkoutId.isBlank() -> "checkoutId is blank"
            brands.isEmpty() || brands.any { it.isBlank() } -> "brands are missing"
            shopperResultUrl.isBlank() || !shopperResultUrl.contains(SCHEME_SEPARATOR) -> "shopperResultUrl is not a URL"
            amountFils <= 0L -> "amountFils must be positive"
            else -> null
        }
        return problem?.let { PaymentError.invalidSession(it) }
    }

    public companion object {
        public const val DEFAULT_CURRENCY: String = "JOD"
        internal const val SCHEME_SEPARATOR: String = "://"
    }
}
