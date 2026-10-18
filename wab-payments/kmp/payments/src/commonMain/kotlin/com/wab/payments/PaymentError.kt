package com.wab.payments

/** Failure classes a client launcher can report. Card data never appears in any of them. */
public enum class PaymentErrorCode {
    /** The session handed to the launcher is malformed. */
    INVALID_SESSION,

    /** No launcher is registered for the session's provider. */
    UNSUPPORTED_PROVIDER,

    /** The device could not reach the gateway. */
    NETWORK,
    TIMEOUT,

    /** The gateway SDK or page reported an error. */
    SDK,

    /** The SDK or app is not configured (missing bridge, activity host, SDK version...). */
    CONFIGURATION,
    UNKNOWN,
}

/**
 * A typed, redacted payment failure. [retryable] tells the UI whether offering "try again" with the
 * same checkout makes sense; a new attempt always needs a new server session.
 */
public data class PaymentError(
    val code: PaymentErrorCode,
    val message: String,
    val retryable: Boolean = false,
    /** The gateway SDK's own error code, kept for support and the admin attempt log. */
    val sdkCode: String? = null,
) {
    public companion object {
        public fun invalidSession(reason: String): PaymentError =
            PaymentError(PaymentErrorCode.INVALID_SESSION, Redaction.scrub(reason))

        public fun unsupportedProvider(provider: String): PaymentError =
            PaymentError(PaymentErrorCode.UNSUPPORTED_PROVIDER, "No launcher for provider ${Redaction.scrub(provider)}")

        public fun configuration(reason: String): PaymentError =
            PaymentError(PaymentErrorCode.CONFIGURATION, Redaction.scrub(reason))

        public fun unknown(reason: String?): PaymentError =
            PaymentError(PaymentErrorCode.UNKNOWN, Redaction.scrub(reason ?: "Unexpected payment failure"))

        public fun sdk(sdkCode: String?, reason: String?, retryable: Boolean = false): PaymentError =
            PaymentError(
                PaymentErrorCode.SDK,
                Redaction.scrub(reason ?: "Payment SDK error"),
                retryable,
                sdkCode?.let(Redaction::scrub),
            )
    }
}

/** Removes anything that looks like a card number from text before it is stored, shown or logged. */
public object Redaction {
    public const val MASK: String = "[redacted]"
    private const val MIN_CARD_DIGITS = 13
    private const val MAX_CARD_DIGITS = 19

    public fun scrub(text: String): String {
        val out = StringBuilder()
        var index = 0
        while (index < text.length) {
            if (text[index].isDigit()) {
                var end = index
                var digits = 0
                var last = index
                while (end < text.length && (text[end].isDigit() || ((text[end] == ' ' || text[end] == '-') && digits > 0))) {
                    if (text[end].isDigit()) {
                        digits += 1
                        last = end
                    }
                    end += 1
                }
                if (digits in MIN_CARD_DIGITS..MAX_CARD_DIGITS) {
                    out.append(MASK)
                    index = last + 1
                } else {
                    out.append(text, index, last + 1)
                    index = last + 1
                }
            } else {
                out.append(text[index])
                index += 1
            }
        }
        return out.toString()
    }
}
