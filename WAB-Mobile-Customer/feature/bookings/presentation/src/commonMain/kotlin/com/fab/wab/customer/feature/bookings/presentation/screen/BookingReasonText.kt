package com.fab.wab.customer.feature.bookings.presentation.screen

import com.fab.wab.customer.core.domain.booking.BookingReason

/** Reason codes the server stores without a text (WAB-Server `constants/bookings.ts`). */
internal object BookingReasonCodes {
    const val CUSTOMER_REQUEST = "CUSTOMER_REQUEST"
}

/** What the reason card shows: the salon's / admin's own words, or a localized line; never the raw code (CUS-092). */
internal sealed interface ReasonDisplay {
    data class Written(val text: String) : ReasonDisplay
    data object CustomerRequest : ReasonDisplay
    data object NotGiven : ReasonDisplay
}

internal fun reasonDisplayOf(reason: BookingReason): ReasonDisplay {
    val written = reason.text?.trim().orEmpty()
    return when {
        written.isNotEmpty() -> ReasonDisplay.Written(written)
        reason.code == BookingReasonCodes.CUSTOMER_REQUEST -> ReasonDisplay.CustomerRequest
        else -> ReasonDisplay.NotGiven
    }
}
