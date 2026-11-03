package com.fab.wab.customer.feature.bookings.presentation.controller.contract

import com.fab.wab.customer.core.domain.booking.BookingSource
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.salon.BranchRef

/** Buttons of a booking card (BUSINESS_DOMAIN §5.22): a completed booking offers Rate and Book again. */
enum class CardAction { RATE, BOOK_AGAIN }

/** Rate only for a registered customer (§5.20); Book again only when the business is known. */
fun cardActionsOf(booking: BookingSummary, signedIn: Boolean): List<CardAction> {
    if (booking.status != BookingStatus.COMPLETED) return emptyList()
    return buildList {
        if (signedIn) add(CardAction.RATE)
        if (booking.salonId != null) add(CardAction.BOOK_AGAIN)
    }
}

/** "Booked by <place>" of a booking the business made (§5.20): the business and, when known, the branch. */
data class BookedBy(val place: String, val branch: String?)

fun bookedByOf(source: BookingSource, salonName: String?, branch: BranchRef?): BookedBy? {
    if (source != BookingSource.MERCHANT) return null
    val place = salonName?.takeIf { it.isNotBlank() } ?: return null
    return BookedBy(place, branch?.name?.takeIf { it.isNotBlank() })
}
