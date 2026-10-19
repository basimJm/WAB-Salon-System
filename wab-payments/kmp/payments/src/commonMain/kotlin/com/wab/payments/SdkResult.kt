package com.wab.payments

/** How a gateway SDK activity/view controller ended, before any gateway-specific type is involved. */
public enum class SdkResultKind { COMPLETED, CANCELED, ERROR }

/**
 * Turns the raw facts of an SDK result (read by the thin Android/iOS wrappers) into a
 * [NativeOutcome]. Kept here, free of platform types, so it is unit-tested once for both platforms.
 * Error texts are scrubbed of anything that looks like a card number.
 */
public fun sdkOutcome(
    kind: SdkResultKind,
    resourcePath: String? = null,
    redirectUrl: String? = null,
    errorCode: String? = null,
    errorMessage: String? = null,
): NativeOutcome = when (kind) {
    SdkResultKind.COMPLETED -> NativeOutcome.Finished(resourcePath?.takeIf { it.isNotBlank() }, redirectUrl)
    SdkResultKind.CANCELED -> NativeOutcome.Cancelled
    SdkResultKind.ERROR -> NativeOutcome.Error(
        sdkCode = errorCode,
        message = errorMessage,
        retryable = errorCode != null && errorCode in RETRYABLE_SDK_CODES,
    )
}

/**
 * SDK error codes worth a "try again" (network/timeouts). The exact OPP code names are UNVERIFIED
 * (no SDK access in the build sandbox): adjust here once seen on a device.
 */
internal val RETRYABLE_SDK_CODES: Set<String> = setOf("ERROR_NETWORK", "ERROR_TIMEOUT", "ERROR_CONNECTION")
